import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlarmClock, AlertTriangle, ArrowRight, Award, Bell, Bolt, Check,
  ChevronRight, CircleHelp, Clock3, CloudUpload, Crown, DoorOpen,
  Eye, EyeOff, FileSpreadsheet, Flag, Image as ImageIcon,
  LayoutDashboard, Lock, LogOut, Menu, MessageSquareText, Monitor, Pencil,
  Play, Plus, Radio, RefreshCw, Send, Settings2, ShieldCheck, Shuffle, Sparkles,
  Square, Timer, Trash2, Trophy, Users, Volume2, WandSparkles, X, Zap
} from 'lucide-react';
import './style.css';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

const formatCountdown = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

function AddUserForm({ onAdd }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form
      className="panel"
      style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}
      onSubmit={(event) => {
        event.preventDefault();
        onAdd(username.trim(), password);
        setUsername('');
        setPassword('');
      }}
    >
      <div className="field" style={{ flex: 1, minWidth: 160 }}>
        <label>NEW USERNAME</label>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="e.g. priya"
          minLength={2}
          required
        />
      </div>
      <div className="field" style={{ flex: 1, minWidth: 160 }}>
        <label>PASSWORD (MIN 8)</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </div>
      <button className="primary" type="submit">
        <Plus size={16} /> Add participant
      </button>
    </form>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('ff_token') || '');
  const [me, setMe] = useState(null);
  const [loginName, setLoginName] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPass, setSignupPass] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [showPass, setShowPass] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [clockNow, setClockNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [page, setPage] = useState('Overview');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ rows: [] });
  const [currentQ, setCurrentQ] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [buzzers, setBuzzers] = useState([]);
  const [topics, setTopics] = useState([]);
  const [scores, setScores] = useState([]);

  const [durationDraft, setDurationDraft] = useState({});
  const [topicUser, setTopicUser] = useState('');
  const [topicText, setTopicText] = useState('');
  const [qNumber, setQNumber] = useState('1');
  const [qAnswer, setQAnswer] = useState('');
  const [qHint, setQHint] = useState('');
  const [qFiles, setQFiles] = useState([]);
  const [scoreDraft, setScoreDraft] = useState({});
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [buzzerFilter, setBuzzerFilter] = useState('all');
  const [teamSize, setTeamSize] = useState(2);
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [teamAnswer, setTeamAnswer] = useState('');
  const [speechExpiredModal, setSpeechExpiredModal] = useState(null);
  const [notifiedTopicIds, setNotifiedTopicIds] = useState(new Set());
  const [questionExpiredModal, setQuestionExpiredModal] = useState(null);
  const [notifiedQuestionIds, setNotifiedQuestionIds] = useState(new Set());
  const [questionMarksDraft, setQuestionMarksDraft] = useState({});
  const [speechMarksDraft, setSpeechMarksDraft] = useState({});
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityDuration, setNewActivityDuration] = useState(60);
  const [newActivityInputType, setNewActivityInputType] = useState('image');
  const [newActivityQuestionMode, setNewActivityQuestionMode] = useState('team');
  const [newActivityQuestionType, setNewActivityQuestionType] = useState('buzzer');
  const [editingActivityKey, setEditingActivityKey] = useState(null);
  const [editingActivityName, setEditingActivityName] = useState('');

  // Custom Activity Questions State
  const [customQNumber, setCustomQNumber] = useState('1');
  const [customQPrompt, setCustomQPrompt] = useState('');
  const [customQAnswer, setCustomQAnswer] = useState('');
  const [customQHint, setCustomQHint] = useState('');
  const [customQTargetUser, setCustomQTargetUser] = useState('');
  const [customQTargetTeam, setCustomQTargetTeam] = useState('');
  const [customQFiles, setCustomQFiles] = useState([]);
  const [customMarksDraft, setCustomMarksDraft] = useState({});

  const isAdmin = me?.role === 'admin';

  const findObjectAct = activities.find((a) => a.key === 'find-object');
  const speechAct = activities.find((a) => a.key === 'lightning-speech');
  const customActivities = activities.filter((a) => a.key !== 'find-object' && a.key !== 'lightning-speech');

  const navAdmin = useMemo(() => [
    ['Overview', LayoutDashboard, 'Overview'],
    ['Participants', Users, 'Participants'],
    ['Teams', Crown, 'Teams'],
    [findObjectAct?.name || 'Find the Object', ImageIcon, 'Find the Object', 'find-object'],
    [speechAct?.name || 'Lightning Speech', MessageSquareText, 'Lightning Speech', 'lightning-speech'],
    ...customActivities.map((a) => [
      a.name,
      a.input_type === 'audio' ? Volume2 : a.input_type === 'text' ? MessageSquareText : ImageIcon,
      a.key,
      a.key
    ]),
    ['Leaderboard', Trophy, 'Leaderboard'],
    ['Settings', Settings2, 'Settings']
  ], [findObjectAct?.name, speechAct?.name, customActivities]);

  const navUser = useMemo(() => [
    ['Overview', LayoutDashboard, 'Overview'],
    ...(findObjectAct?.unlocked ? [[findObjectAct?.name || 'Find the Object', ImageIcon, 'Find the Object', 'find-object']] : []),
    ['Teams', Crown, 'Teams'],
    ...(speechAct?.unlocked ? [[speechAct?.name || 'Lightning Speech', MessageSquareText, 'Lightning Speech', 'lightning-speech']] : []),
    ...customActivities.filter((a) => a.unlocked).map((a) => [
      a.name,
      a.input_type === 'audio' ? Volume2 : a.input_type === 'text' ? MessageSquareText : ImageIcon,
      a.key,
      a.key
    ]),
    ['Leaderboard', Trophy, 'Leaderboard']
  ], [findObjectAct, speechAct, customActivities]);

  const api = useCallback(async (path, options = {}) => {
    const headers = { ...(options.headers || {}) };

    if (token) headers.Authorization = `Bearer ${token}`;

    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API}${path}`, {
      ...options,
      headers
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new Error(
        typeof data === 'object' && data !== null
          ? data.detail || data.message || 'Request failed'
          : data || 'Request failed'
      );
    }

    return data;
  }, [token]);

  const refresh = useCallback(async () => {
    if (!token) return;

    try {
      const profile = await api('/api/me');
      setMe(profile);

      const requests = [
        api('/api/users'),
        api('/api/teams'),
        api('/api/questions'),
        api('/api/activities'),
        api('/api/leaderboard'),
        api('/api/lightning/topics'),
        api('/api/buzzers'),
        api('/api/scores')
      ];

      const results = await Promise.allSettled(requests);

      if (results[0].status === 'fulfilled') setUsers(results[0].value);
      if (results[1].status === 'fulfilled') setTeams(results[1].value);
      if (results[2].status === 'fulfilled') {
        const qList = results[2].value;
        setQuestions(qList);
        const activeQ = qList.find((q) => q.status === 'active');
        setCurrentQ(activeQ || null);
      }
      if (results[3].status === 'fulfilled') setActivities(results[3].value);
      if (results[4].status === 'fulfilled') setLeaderboard(results[4].value);
      if (results[5].status === 'fulfilled') setTopics(results[5].value);
      if (results[6].status === 'fulfilled') setBuzzers(results[6].value);
      if (results[7].status === 'fulfilled') setScores(results[7].value);

      if (profile.role === 'admin') {
        const extra = await Promise.allSettled([
          api('/api/submissions')
        ]);

        if (extra[0].status === 'fulfilled') setSubmissions(extra[0].value);
      } else {
        setSubmissions([]);
      }
    } catch (err) {
      if (err.message.toLowerCase().includes('token') ||
          err.message.toLowerCase().includes('unauthorized')) {
        setToken('');
        setMe(null);
        localStorage.removeItem('ff_token');
      } else {
        setError(err.message);
      }
    }
  }, [api, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!token) return undefined;

    const interval = setInterval(() => {
      refresh();
    }, 3000);

    return () => clearInterval(interval);
  }, [token, refresh]);

  useEffect(() => {
    const timer = setInterval(() => {
      setClockNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const playAlarmSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {}
  };

  // Question timer expiry notification for Admin
  useEffect(() => {
    if (!isAdmin) return;
    if (currentQ && currentQ.status === 'active' && currentQ.ends_at) {
      const endsAtMs = new Date(currentQ.ends_at).getTime();
      if (clockNow >= endsAtMs && !notifiedQuestionIds.has(currentQ.id)) {
        setNotifiedQuestionIds((prev) => new Set(prev).add(currentQ.id));
        setQuestionExpiredModal({
          id: currentQ.id,
          number: currentQ.number
        });
        playAlarmSound();
      }
    }
  }, [isAdmin, currentQ, clockNow, notifiedQuestionIds]);

  // Lightning Speech timer expiry notification for Admin
  useEffect(() => {
    if (!isAdmin) return;
    const activeTopic = topics.find((t) => t.status === 'active');
    if (activeTopic && activeTopic.ends_at) {
      const endsAtMs = new Date(activeTopic.ends_at).getTime();
      if (clockNow >= endsAtMs && !notifiedTopicIds.has(activeTopic.id)) {
        setNotifiedTopicIds((prev) => new Set(prev).add(activeTopic.id));
        setSpeechExpiredModal({
          id: activeTopic.id,
          username: activeTopic.username,
          text: activeTopic.text
        });
        playAlarmSound();
      }
    }
  }, [isAdmin, topics, clockNow, notifiedTopicIds]);

  const handleSaveMark = async (teamId, points, qId = null) => {
    const questionId = qId || currentQ?.id;
    if (!questionId) return;
    const pts = Number(points);
    if (isNaN(pts)) return;
    const teamObj = teams.find((t) => t.id === teamId);
    run(async () => {
      await api('/api/scores', {
        method: 'POST',
        body: JSON.stringify({
          team_id: teamId,
          round_key: `object:${questionId}`,
          activity_key: 'find-object',
          points: pts
        })
      });
    }, `Mark of ${pts >= 0 ? '+' : ''}${pts} recorded for ${teamObj?.name || 'team'}! Leaderboard updated.`);
  };

  const handleSaveSpeechMark = async (teamId, points, topicId) => {
    if (!topicId) return;
    const pts = Number(points);
    if (isNaN(pts)) return;
    const teamObj = teams.find((t) => t.id === teamId);
    run(async () => {
      await api('/api/scores', {
        method: 'POST',
        body: JSON.stringify({
          team_id: teamId,
          round_key: `speech:${topicId}`,
          activity_key: 'lightning-speech',
          points: pts
        })
      });
    }, `Mark of ${pts >= 0 ? '+' : ''}${pts} recorded for ${teamObj?.name || 'team'}! Leaderboard updated.`);
  };

  const handleSaveGenericMark = async (teamId, points, activityKey, roundKey) => {
    if (!roundKey) return;
    const pts = Number(points);
    if (isNaN(pts)) return;
    const teamObj = teams.find((t) => t.id === teamId);
    run(async () => {
      await api('/api/scores', {
        method: 'POST',
        body: JSON.stringify({
          team_id: teamId,
          round_key: roundKey,
          activity_key: activityKey,
          points: pts
        })
      });
    }, `Mark of ${pts >= 0 ? '+' : ''}${pts} recorded for ${teamObj?.name || 'team'}! Leaderboard updated.`);
  };

  const handleUnlockQuestion = async (qId, qNum) => {
    run(async () => {
      const res = await api(`/api/questions/${qId}/unlock`, { method: 'POST' });
      setNotifiedQuestionIds((prev) => {
        const next = new Set(prev);
        next.delete(qId);
        return next;
      });
      setQuestionExpiredModal(null);
      if (res?.question) {
        setCurrentQ(res.question);
      }
    }, `Question ${qNum} unlocked! Timer running.`);
  };

  const handleExtendQuestion = async (qId, qNum) => {
    run(async () => {
      const res = await api(`/api/questions/${qId}/extend`, { method: 'POST' });
      setNotifiedQuestionIds((prev) => {
        const next = new Set(prev);
        next.delete(qId);
        return next;
      });
      setQuestionExpiredModal(null);
      if (res?.question) {
        setCurrentQ(res.question);
      }
    }, `Question ${qNum} timer extended by +30 seconds!`);
  };

  const handlePressBuzzer = async (roundKey = null, actKey = 'find-object') => {
    const key = roundKey || (currentQ ? `object:${currentQ.id}` : 'general-round');
    run(async () => {
      await api('/api/buzzers', {
        method: 'POST',
        body: JSON.stringify({
          round_key: key,
          activity_key: actKey
        })
      });
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) {}
    }, 'Buzzer pressed successfully!');
  };

  const run = async (action, successMessage) => {
    setBusy(true);
    setError('');

    try {
      await action();
      if (successMessage) setToast(successMessage);
      await refresh();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!toast) return undefined;

    const timeout = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const login = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setAuthMessage('');

    try {
      const result = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: loginName.trim(),
          password: loginPass
        })
      });

      const newToken = result.access_token || result.token;
      localStorage.setItem('ff_token', newToken);
      setToken(newToken);
      setMe(result.user || null);
      setLoginPass('');
    } catch (err) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setBusy(false);
    }
  };

  const signup = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setAuthMessage('');

    try {
      await api('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          username: signupName.trim(),
          password: signupPass
        })
      });

      setAuthMode('login');
      setLoginName(signupName.trim());
      setLoginPass('');
      setSignupName('');
      setSignupPass('');
      setAuthMessage('Account created successfully. Please sign in.');
    } catch (err) {
      setError(err.message || 'Unable to create account');
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('ff_token');
    setToken('');
    setMe(null);
    setPage('Overview');
    setError('');
  };

  const act = (key) => activities.find((activity) => activity.key === key);

  const loadBuzzers = async (filter = 'all') => {
    setBuzzerFilter(filter);

    await run(async () => {
      const suffix = filter === 'all' ? '' : `?filter=${encodeURIComponent(filter)}`;
      const result = await api(`/api/buzzers${suffix}`);
      setBuzzers(result);
      setPage('Live buzzer');
    });
  };

  const addUser = async (username, password) => {
    await run(
      () => api('/api/users', {
        method: 'POST',
        body: JSON.stringify({ username, password, role: 'user' })
      }),
      'Participant created'
    );
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete participant "${user.username}"? This action cannot be undone.`)) {
      return;
    }

    await run(
      () => api(`/api/users/${user.id}`, { method: 'DELETE' }),
      `Participant ${user.username} deleted`
    );
  };

  const deleteTeam = async (team) => {
    if (!window.confirm(`Delete team "${team.name}"? All memberships, scores, and buzzer entries will be removed.`)) {
      return;
    }
    await run(
      () => api(`/api/teams/${team.id}`, { method: 'DELETE' }),
      `Team ${team.name} deleted`
    );
  };

  const Header = () => (
    <header className="topbar">
      <div className="top-title">
        <span className="crumb">ARENA</span>
        <ChevronRight size={14} />
        <b>{page}</b>
      </div>

      <div className="top-actions">
        <div className="live-pill">
          <span className="live-dot" /> LOCAL SESSION
        </div>

        <button className="icon-btn" title="Refresh" onClick={refresh}>
          <RefreshCw size={17} />
        </button>

        <div className="user-chip">
          <div className="avatar">{me?.username?.slice(0, 1).toUpperCase()}</div>
          <div>
            <b>{me?.username}</b>
            <small>{isAdmin ? 'Event admin' : 'Participant'}</small>
          </div>
        </div>

        <button className="icon-btn" title="Log out" onClick={logout}>
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );

  const Stat = ({ icon: Icon, label, value, sub, accent = 'violet' }) => (
    <div className="stat-card">
      <div className={`stat-icon ${accent}`}>
        <Icon size={19} />
      </div>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
      <div className="stat-line" />
    </div>
  );

  const timerControl = (activity) => (
    <div className="timer-edit">
      <Clock3 size={16} />
      <input
        type="number"
        min="10"
        max="3600"
        value={durationDraft[activity.key] ?? activity.duration_seconds}
        onChange={(event) => setDurationDraft({
          ...durationDraft,
          [activity.key]: event.target.value
        })}
      />
      <span>sec</span>
      <button
        className="small-btn"
        onClick={() => run(
          () => api(`/api/activities/${activity.key}/timer`, {
            method: 'PATCH',
            body: JSON.stringify({
              duration_seconds: Number(
                durationDraft[activity.key] ?? activity.duration_seconds
              )
            })
          }),
          `${activity.name} timer saved`
        )}
      >
        Save
      </button>
    </div>
  );

  const renderOverview = () => (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            WEDNESDAY ENERGY, FRIDAY SPIRIT <Sparkles size={13} />
          </div>
          <h1>Let’s make some <span>noise.</span></h1>
          <p>Everything you need to run your technical showdown.</p>
        </div>

        <div className="date-badge">
          <span>EVENT CONTROL</span>
          <b>FUN FRIDAY <Zap size={15} /></b>
          <small>LOCAL INSTANCE · READY</small>
        </div>
      </div>

      <div className="stats-grid">
        <Stat
          icon={Users}
          label="Participants"
          value={users.length}
          sub={`${users.filter((user) => user.online).length} online right now`}
        />
        <Stat
          icon={Flag}
          label="Teams formed"
          value={teams.length}
          sub="Ready for the showdown"
          accent="blue"
        />
        <Stat
          icon={Activity}
          label="Active questions"
          value={questions.filter((question) => question.status === 'active').length}
          sub={`${questions.length} questions prepared`}
          accent="orange"
        />
        <Stat
          icon={Trophy}
          label="Leaderboard"
          value={leaderboard.rows?.length || 0}
          sub="Teams in the standings"
          accent="green"
        />
      </div>

      <div className="section-heading">
        <div>
          <span className="section-kicker">YOUR CONTROL ROOM</span>
          <h2>Activity control</h2>
        </div>
        <span className="subtle">Unlock each game when you're ready</span>
      </div>

      <div className="activity-grid">
        <div className="activity-card object-card">
          <div className="activity-top">
            <div className="game-icon"><ImageIcon size={22} /></div>
            <span className={`status-tag ${act('find-object')?.unlocked ? 'on' : ''}`}>
              <i /> {act('find-object')?.unlocked ? 'UNLOCKED' : 'LOCKED'}
            </span>
          </div>
          <div className="game-label">GAME 01 · VISUAL PUZZLE</div>
          <h3>Find the Object</h3>
          <p>Connect the clues. Name the tech. Beat the buzzer.</p>
          <div className="mini-pics">
            <div>⌘</div><div>{'{ }'}</div><div>◈</div><div>⚡</div><div>+</div>
          </div>
          <div className="activity-foot">
            {timerControl(act('find-object') || {
              key: 'find-object', duration_seconds: 60, name: 'Find the Object'
            })}
            <button
              className={act('find-object')?.unlocked ? 'secondary' : 'primary'}
              onClick={() => run(
                () => api('/api/activities/find-object/unlock', {
                  method: 'PATCH',
                  body: JSON.stringify({ published: !act('find-object')?.unlocked })
                }),
                `Find the Object ${act('find-object')?.unlocked ? 'locked' : 'unlocked'}`
              )}
            >
              {act('find-object')?.unlocked ? 'Lock activity' : 'Unlock activity'}
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <div className="activity-card speech-card">
          <div className="activity-top">
            <div className="game-icon orange"><MessageSquareText size={22} /></div>
            <span className={`status-tag ${act('lightning-speech')?.unlocked ? 'on' : ''}`}>
              <i /> {act('lightning-speech')?.unlocked ? 'UNLOCKED' : 'LOCKED'}
            </span>
          </div>
          <div className="game-label">GAME 02 · TOPIC & TIMER</div>
          <h3>Lightning Speech</h3>
          <p>Speak about your assigned topic before the timer runs out.</p>
          <div className="speech-preview">
            <div className="sound-bars">
              {Array.from({ length: 15 }, (_, index) => <i key={index} />)}
            </div>
            <span>READY TO SPEAK?</span>
            <Volume2 size={20} />
          </div>
          <div className="activity-foot">
            {timerControl(act('lightning-speech') || {
              key: 'lightning-speech', duration_seconds: 120, name: 'Lightning Speech'
            })}
            <button
              className={act('lightning-speech')?.unlocked ? 'secondary' : 'primary'}
              onClick={() => run(
                () => api('/api/activities/lightning-speech/unlock', {
                  method: 'PATCH',
                  body: JSON.stringify({ published: !act('lightning-speech')?.unlocked })
                }),
                `Lightning Speech ${act('lightning-speech')?.unlocked ? 'locked' : 'unlocked'}`
              )}
            >
              {act('lightning-speech')?.unlocked ? 'Lock activity' : 'Unlock activity'}
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Dynamic cards for custom activities */}
        {activities.filter(a => a.key !== 'find-object' && a.key !== 'lightning-speech').map((activity) => (
          <div className="activity-card" key={activity.key} style={{ borderColor: '#3b3660' }}>
            <div className="activity-top">
              <div className="game-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                <Sparkles size={22} />
              </div>
              <span className={`status-tag ${activity.unlocked ? 'on' : ''}`}>
                <i /> {activity.unlocked ? 'UNLOCKED' : 'LOCKED'}
              </span>
            </div>
            <div className="game-label">CUSTOM ACTIVITY</div>
            <h3>{activity.name}</h3>
            <p style={{ fontSize: 11, color: '#8892b0' }}>
              Input: {activity.input_type || 'image'} · Mode: {(activity.question_mode || 'team') === 'team' ? 'Per Team' : 'Per Member'}
            </p>
            <div className="activity-foot">
              {timerControl(activity)}
              <button
                className={activity.unlocked ? 'secondary' : 'primary'}
                onClick={() => run(
                  () => api(`/api/activities/${activity.key}/unlock`, {
                    method: 'PATCH',
                    body: JSON.stringify({ published: !activity.unlocked })
                  }),
                  `${activity.name} ${activity.unlocked ? 'locked' : 'unlocked'}`
                )}
              >
                {activity.unlocked ? 'Lock activity' : 'Unlock activity'}
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bottom-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Participant pulse</h3>
              <p>Who's in the arena right now</p>
            </div>
            <button className="text-btn" onClick={() => setPage('Participants')}>
              View all <ArrowRight size={14} />
            </button>
          </div>

          <div className="participant-list">
            {users.slice(0, 5).map((user) => (
              <div className="participant-row" key={user.id}>
                <div className="avatar small">{user.username[0].toUpperCase()}</div>
                <div className="participant-name">
                  <b>{user.username}</b>
                  <small>{user.team_name || 'Not assigned to a team'}</small>
                </div>
                <span className={`presence ${user.online ? 'online' : 'offline'}`}>
                  <i /> {user.online ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
            {!users.length && <div className="empty-inline">No participants yet.</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Quick actions</h3>
              <p>Keep the event moving</p>
            </div>
            <Bolt size={19} />
          </div>
          <button className="quick-action" onClick={() => setPage('Participants')}>
            <Users size={18} /><span>Manage participants</span><ChevronRight size={15} />
          </button>
          <button className="quick-action" onClick={() => setPage('Teams')}>
            <Crown size={18} /><span>Organize teams</span><ChevronRight size={15} />
          </button>
          <button className="quick-action" onClick={() => setPage('Find the Object')}>
            <ImageIcon size={18} /><span>Manage questions</span><ChevronRight size={15} />
          </button>
          <button className="quick-action" onClick={() => setPage('Lightning Speech')}>
            <MessageSquareText size={18} /><span>Start Lightning Speech</span><ChevronRight size={15} />
          </button>
        </div>
      </div>
    </>
  );

  const renderParticipants = () => (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">ARENA MEMBERS</div>
          <h1>Participants<span>.</span></h1>
          <p>Manage participant accounts and check who's online.</p>
        </div>
        <div className="inline-stat">
          <Users size={17} /><span>Total participants</span><b>{users.length}</b>
        </div>
      </div>

      {isAdmin && <AddUserForm onAdd={addUser} />}

      <div className="panel table-panel">
        <div className="panel-head">
          <div>
            <h3>Registered participants</h3>
            <p>Participant accounts currently active in the arena</p>
          </div>
          <button className="icon-btn" onClick={refresh} title="Refresh participants">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>PARTICIPANT</th>
                <th>TEAM</th>
                <th>STATUS</th>
                {isAdmin && <th>ACTION</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="table-user">
                      <div className="avatar small">{user.username[0].toUpperCase()}</div>
                      <div><b>{user.username}</b><small>Participant</small></div>
                    </div>
                  </td>
                  <td>{user.team_name || '—'}</td>
                  <td>
                    <span className={`presence ${user.online ? 'online' : 'offline'}`}>
                      <i /> {user.online ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td>
                      {user.role !== 'admin' ? (
                        <button
                          className="danger-btn"
                          onClick={() => deleteUser(user)}
                          disabled={busy}
                        >
                          <X size={14} /> Delete
                        </button>
                      ) : (
                        <span className="muted">Protected</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {!users.length && (
                <tr><td colSpan={isAdmin ? 4 : 3}>No participants found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderTeams = () => {
    const eligibleUsers = users.filter((u) => u.role === 'user');
    const s = Math.max(1, Number(teamSize) || 2);
    const n = eligibleUsers.length;
    const numTeams = Math.floor(n / s);
    const rem = n % s;

    return (
      <>
        <div className="page-intro">
          <div>
            <div className="eyebrow">TEAM MANAGEMENT</div>
            <h1>Teams<span>.</span></h1>
            <p>Shuffle or manually organize teams. Team names can be edited by admins or team members.</p>
          </div>
          <div className="inline-stat">
            <Users size={17} /><span>Eligible participants</span><b>{n}</b>
          </div>
        </div>

        {isAdmin && (
          <div className="split-layout">
            <div className="panel">
              <div className="panel-head">
                <div>
                  <h3>Shuffle & auto-generate teams</h3>
                  <p>Set members per team. Any leftover participants are evenly distributed (+1 member).</p>
                </div>
                <div className="step-badge"><Shuffle size={12} /> AUTO</div>
              </div>

              <div className="field">
                <label>MEMBERS PER TEAM</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={teamSize}
                    onChange={(e) => setTeamSize(Math.max(1, Number(e.target.value) || 1))}
                    style={{ width: 80, textAlign: 'center', fontWeight: 'bold', fontSize: 14 }}
                  />
                  {[2, 3, 4, 5].map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={teamSize === count ? 'primary small' : 'secondary small'}
                      onClick={() => setTeamSize(count)}
                    >
                      {count} per team
                    </button>
                  ))}
                </div>
              </div>

              <div className="callout" style={{ margin: '14px 0 18px', padding: 12 }}>
                <Users size={16} />
                <div>
                  <b>Distribution preview</b>
                  <p>
                    {n === 0
                      ? 'No registered participants yet to shuffle.'
                      : n <= s
                      ? `All ${n} participant(s) will be placed into 1 team.`
                      : rem === 0
                      ? `${n} participants will be divided into ${numTeams} teams of exactly ${s} members.`
                      : `${n} participants will form ${numTeams} teams: ${rem} team${rem > 1 ? 's' : ''} will have ${s + 1} members (${s}+1 leftover), and ${numTeams - rem} team${numTeams - rem > 1 ? 's' : ''} will have ${s} members.`}
                  </p>
                </div>
              </div>

              <button
                className="primary wide"
                type="button"
                disabled={busy || n === 0}
                onClick={() => run(
                  () => api('/api/teams/generate', {
                    method: 'POST',
                    body: JSON.stringify({ team_size: s })
                  }),
                  'Teams shuffled and created successfully!'
                )}
              >
                <Shuffle size={16} /> Shuffle teams now
              </button>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div><h3>Custom team builder</h3><p>Choose a specific name and select members manually.</p></div>
                <div className="step-badge"><Plus size={12} /> MANUAL</div>
              </div>
              <form onSubmit={(event) => {
                event.preventDefault();
                run(async () => {
                  await api('/api/teams', {
                    method: 'POST',
                    body: JSON.stringify({
                      name: teamName.trim(),
                      member_ids: teamMembers.map(Number)
                    })
                  });
                  setTeamName('');
                  setTeamMembers([]);
                }, 'Team created');
              }}>
                <div className="field">
                  <label>TEAM NAME</label>
                  <input
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    placeholder="e.g. Binary Beasts"
                    required
                  />
                </div>
                <div className="field">
                  <label>SELECT PARTICIPANTS</label>
                  <select
                    multiple
                    style={{ height: 110 }}
                    value={teamMembers}
                    onChange={(event) => setTeamMembers(
                      Array.from(event.target.selectedOptions, (option) => option.value)
                    )}
                  >
                    {users.filter((user) => user.role === 'user').map((user) => (
                      <option value={String(user.id)} key={user.id}>
                        {user.username} {user.team_name ? `(currently ${user.team_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="secondary wide" type="submit" disabled={busy || !teamName.trim()}>
                  <Plus size={16} /> Create custom team
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="section-heading">
          <div>
            <span className="section-kicker">ACTIVE TEAMS</span>
            <h2>Arena teams <span className="count-badge">{teams.length}</span></h2>
          </div>
          <span className="subtle">Click the pencil icon to rename your team</span>
        </div>

        <div className="team-grid">
          {teams.map((team) => {
            const isMyTeam = team.members?.some((m) => m.id === me?.id);
            const canEdit = isAdmin || isMyTeam;

            return (
              <div
                className="panel team-card"
                key={team.id}
                style={isMyTeam ? { borderColor: 'var(--purple)', background: 'linear-gradient(145deg, #211c38, #161a2e)' } : {}}
              >
                <div className="team-card-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="team-card-icon"><Crown size={18} /></div>
                    <span style={{ fontSize: 10, letterSpacing: '0.08em', color: '#b8a5f3' }}>
                      {team.members?.length || 0} MEMBERS
                    </span>
                  </div>
                  {isMyTeam && (
                    <span className="role-pill" style={{ background: '#3b2559', color: '#d8c7ff', border: '1px solid #6b47a4' }}>
                      YOUR TEAM
                    </span>
                  )}
                </div>

                {editingTeamId === team.id ? (
                  <form
                    className="rename-line"
                    style={{ marginBottom: 14 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!editingTeamName.trim()) return;
                      run(async () => {
                        await api(`/api/teams/${team.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ name: editingTeamName.trim() })
                        });
                        setEditingTeamId(null);
                      }, `Team renamed to "${editingTeamName.trim()}"`);
                    }}
                  >
                    <input
                      value={editingTeamName}
                      onChange={(e) => setEditingTeamName(e.target.value)}
                      autoFocus
                      placeholder="Team name"
                      required
                    />
                    <button className="primary small" type="submit" disabled={busy}>Save</button>
                    <button className="secondary small" type="button" onClick={() => setEditingTeamId(null)}>Cancel</button>
                  </form>
                ) : (
                  <div className="team-name-line" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{team.name}</h3>
                    {canEdit && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="icon-btn"
                          type="button"
                          title={isAdmin ? "Rename team (Admin)" : "Rename your team"}
                          onClick={() => {
                            setEditingTeamId(team.id);
                            setEditingTeamName(team.name);
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        {isAdmin && (
                          <button
                            className="secondary small btn-delete"
                            type="button"
                            title="Delete team"
                            style={{ color: '#f87171', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 11 }}
                            onClick={() => deleteTeam(team)}
                            disabled={busy}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="team-members">
                  {(team.members || []).map((member) => (
                    <span
                      key={member.id}
                      className="member-pill"
                      style={member.id === me?.id ? { background: '#352554', borderColor: '#8b5cf6', color: '#fff' } : {}}
                    >
                      {member.username} {member.id === me?.id ? ' (You)' : ''}
                    </span>
                  ))}
                  {!team.members?.length && <span className="muted" style={{ fontSize: 11 }}>No members yet</span>}
                </div>
              </div>
            );
          })}
          {!teams.length && <div className="panel empty-inline" style={{ gridColumn: '1 / -1' }}>No teams created yet. Use the shuffle button above to form teams.</div>}
        </div>
      </>
    );
  };

  const renderSpeech = () => {
    const activeTopic = topics.find((topic) => topic.status === 'active');
    const myTopic = topics.find((topic) => topic.user_id === me?.id);
    const speechActObj = act('lightning-speech') || { key: 'lightning-speech', duration_seconds: 120, name: 'Lightning Speech' };

    return (
      <>
        <div className="page-intro">
          <div>
            <div className="eyebrow">GAME 02 · TOPIC & TIMER</div>
            <div className="title-rename-wrap">
              <h1>{speechActObj.name || 'Lightning Speech'}<span>.</span></h1>
              {isAdmin && (
                <button
                  className="btn-inline-rename"
                  type="button"
                  onClick={() => {
                    const currentName = speechActObj.name || 'Lightning Speech';
                    const newName = window.prompt('Enter new name for Lightning Speech:', currentName);
                    if (newName && newName.trim() && newName.trim() !== currentName) {
                      run(
                        () => api('/api/activities/lightning-speech/rename', {
                          method: 'PATCH',
                          body: JSON.stringify({ name: newName.trim() })
                        }),
                        `Activity renamed to "${newName.trim()}"`
                      );
                    }
                  }}
                  title="Rename activity"
                >
                  <Pencil size={12} /> Rename
                </button>
              )}
            </div>
            <p>Each speaker gets a private topic and a timed turn.</p>
          </div>
          <div className="inline-stat orange">
            <Clock3 size={17} /><span>Each turn</span>
            <b>{speechActObj.duration_seconds || 120}s</b>
          </div>
        </div>

        {isAdmin ? (
          <>
            <div className="split-layout">
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Assign a speaking topic</h3>
                    <p>Only the assigned participant and admin can see the topic.</p>
                  </div>
                  <div className="step-badge">01 / ASSIGN</div>
                </div>

                <form onSubmit={(event) => {
                  event.preventDefault();
                  run(async () => {
                    await api('/api/lightning/topics', {
                      method: 'POST',
                      body: JSON.stringify({
                        user_id: Number(topicUser),
                        text: topicText.trim()
                      })
                    });
                    setTopicText('');
                  }, 'Topic assigned');
                }}>
                  <div className="field">
                    <label>PARTICIPANT</label>
                    <select value={topicUser} onChange={(event) => setTopicUser(event.target.value)} required>
                      <option value="">Choose a participant…</option>
                      {users.filter((user) => user.role === 'user').map((user) => (
                        <option value={user.id} key={user.id}>
                          {user.username}{user.team_name ? ` · ${user.team_name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>SPEAKING TOPIC</label>
                    <input
                      value={topicText}
                      onChange={(event) => setTopicText(event.target.value)}
                      placeholder="e.g. The future of technology"
                      required
                    />
                  </div>

                  <button className="primary" type="submit" disabled={busy}>
                    <Plus size={16} /> Assign topic
                  </button>
                </form>

                <div className="privacy-note">
                  <Lock size={16} />
                  <span>
                    <b>Private topic</b>
                    <small>Other participants should not receive this topic in their API response.</small>
                  </span>
                </div>
              </div>

              {/* Live Speaking Round Card matching Question Live Card */}
              <div className="panel active-question-panel speech-live">
                <div className="panel-head">
                  <div><h3>Live speaking round</h3><p>What participants see right now</p></div>
                  <span className={`status-tag ${activeTopic ? 'on' : ''}`}>
                    <i /> {activeTopic ? 'LIVE' : 'STANDBY'}
                  </span>
                </div>

                {activeTopic ? (() => {
                  const topicTeam = teams.find((team) => team.members?.some((member) => member.id === activeTopic.user_id));
                  const topicBuzzers = buzzers
                    .filter((b) => b.round_key === `speech:${activeTopic.id}`)
                    .sort((a, b) => a.position - b.position);
                  const sEndsAtMs = activeTopic.ends_at ? new Date(activeTopic.ends_at).getTime() : null;
                  const sSecondsLeft = sEndsAtMs ? Math.max(0, Math.ceil((sEndsAtMs - clockNow) / 1000)) : 0;
                  const sDuration = speechActObj.duration_seconds || 120;
                  const sPercent = sEndsAtMs ? Math.min(100, Math.max(0, (sSecondsLeft / sDuration) * 100)) : 0;

                  return (
                    <>
                      <div className="live-question-number">
                        SPEAKER: <b>{activeTopic.username}</b> {topicTeam ? `· ${topicTeam.name}` : ''}
                      </div>

                      <div className="secret-card" style={{ margin: '12px 0' }}>
                        <span>THE SPEAKER'S TOPIC</span>
                        <h2>“{activeTopic.text || 'Private topic'}”</h2>
                        <small>{activeTopic.username} is currently presenting</small>
                      </div>

                      <div className="timer-display" style={{ display: 'grid', gap: 6, margin: '14px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Clock3 size={18} color={sSecondsLeft <= 10 && sSecondsLeft > 0 ? '#fb923c' : sSecondsLeft === 0 ? '#ef4444' : '#a78bfa'} />
                            <b style={{ fontSize: 18, color: sSecondsLeft === 0 ? '#ef4444' : '#f8fafc' }}>
                              {activeTopic.ends_at ? (sSecondsLeft > 0 ? `${sSecondsLeft}s remaining` : 'TIME EXPIRED (0s)') : '—'}
                            </b>
                          </div>
                          <small style={{ color: '#8c95af' }}>
                            {sSecondsLeft > 0 ? `${sSecondsLeft}s left in round` : 'Turn ended'}
                          </small>
                        </div>
                        {activeTopic.ends_at && (
                          <div style={{ width: '100%', height: 5, background: '#22283e', borderRadius: 3, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${sPercent}%`,
                                height: '100%',
                                background: sSecondsLeft <= 10 ? '#ef4444' : 'linear-gradient(90deg, #a78bfa, #ec4899)',
                                transition: 'width 1s linear'
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button
                          className="secondary"
                          style={{ flex: 1 }}
                          onClick={() => run(
                            () => api(`/api/lightning/topics/${activeTopic.id}/lock`, { method: 'POST' }),
                            `Speaker turn paused`
                          )}
                          title="Pause or lock this speaker turn"
                        >
                          <Lock size={14} /> Lock
                        </button>
                        <button
                          className="secondary"
                          style={{ flex: 1 }}
                          onClick={() => run(
                            () => api(`/api/lightning/topics/${activeTopic.id}/close`, { method: 'POST' }),
                            'Speaking turn ended'
                          )}
                          title="End speaker turn"
                        >
                          <Square size={14} /> Close
                        </button>
                        <button
                          className="secondary"
                          style={{ flex: 1 }}
                          onClick={() => run(
                            () => api(`/api/lightning/topics/${activeTopic.id}/extend`, { method: 'POST' }),
                            'Timer extended by +30 seconds'
                          )}
                          title="Add 30 seconds to the timer"
                        >
                          <Plus size={14} /> +30s Extend
                        </button>
                        <button
                          className="secondary btn-delete"
                          style={{ flex: 1 }}
                          onClick={() => {
                            if (window.confirm(`Delete topic for "${activeTopic.username}"?`)) {
                              run(
                                () => api(`/api/lightning/topics/${activeTopic.id}`, { method: 'DELETE' }),
                                `Topic for ${activeTopic.username} deleted`
                              );
                            }
                          }}
                          title="Delete this topic"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>

                      {/* Buzzers for Speech Turn */}
                      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #282e44' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Radio size={16} color="#fb923c" />
                            <b style={{ fontSize: 12 }}>Buzzers for Speech Turn</b>
                            <span className="count-badge">{topicBuzzers.length}</span>
                          </div>
                          {topicBuzzers.length > 0 && (
                            <button
                              className="secondary small btn-delete"
                              onClick={() => {
                                run(
                                  () => api(`/api/buzzers/reset?round_key=speech:${activeTopic.id}`, { method: 'POST' }),
                                  'Buzzer log cleared'
                                );
                              }}
                            >
                              <Trash2 size={12} /> Reset to 0
                            </button>
                          )}
                        </div>

                        {topicBuzzers.length ? (
                          <div className="live-buzzers-queue" style={{ margin: 0 }}>
                            <div className="queue-items">
                              {topicBuzzers.map((b) => (
                                <div key={b.id} className={`queue-chip ${b.position === 1 ? 'first-buzz' : ''}`}>
                                  <span className="pos">#{b.position}</span>
                                  <b>{b.team_name}</b>
                                  {b.username && <small>({b.username})</small>}
                                  {b.position === 1 && <span className="winner-tag">1ST BUZZ</span>}
                                  <div style={{ display: 'inline-flex', gap: 4, marginLeft: 6 }}>
                                    <button
                                      type="button"
                                      className="pill-btn pos"
                                      onClick={() => handleSaveSpeechMark(b.team_id, 10, activeTopic.id)}
                                      title="Award +10"
                                    >
                                      +10
                                    </button>
                                    <button
                                      type="button"
                                      className="pill-btn neg"
                                      onClick={() => handleSaveSpeechMark(b.team_id, -5, activeTopic.id)}
                                      title="Deduct -5"
                                    >
                                      -5
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                            No team has pressed the buzzer yet for this turn. (Buzzer count: 0)
                          </p>
                        )}
                      </div>

                      {/* Instant Scoring Box matching the screenshot */}
                      <div className="live-scoring-card" style={{ marginTop: 18 }}>
                        <div className="scoring-head">
                          <div>
                            <h4>Score {activeTopic.username}'s Speech (Leaderboard updates Instantly)</h4>
                            <span className="subtle">Enter marks (+ or - e.g. +10, -5).</span>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gap: 8 }}>
                          {teams.map((team) => {
                            const scoreObj = scores.find(
                              (s) => s.team_id === team.id && s.round_key === `speech:${activeTopic.id}`
                            );
                            const currentMark = scoreObj ? scoreObj.points : null;
                            const draftKey = `${team.id}:speech:${activeTopic.id}`;
                            const draftVal = speechMarksDraft[draftKey] ?? (currentMark !== null ? String(currentMark) : '10');

                            return (
                              <div key={team.id} className="score-badge-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                  <Crown size={14} color="#a78bfa" />
                                  <b style={{ fontSize: 12 }}>{team.name}</b>
                                  {currentMark !== null && (
                                    <span className={`points-pill ${currentMark >= 0 ? 'pos' : 'neg'}`}>
                                      {currentMark > 0 ? `+${currentMark}` : currentMark} pts
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <button
                                    type="button"
                                    className="pill-btn pos"
                                    onClick={() => handleSaveSpeechMark(team.id, 10, activeTopic.id)}
                                    title="Give +10"
                                  >
                                    +10
                                  </button>
                                  <button
                                    type="button"
                                    className="pill-btn pos"
                                    onClick={() => handleSaveSpeechMark(team.id, 5, activeTopic.id)}
                                    title="Give +5"
                                  >
                                    +5
                                  </button>
                                  <button
                                    type="button"
                                    className="pill-btn neg"
                                    onClick={() => handleSaveSpeechMark(team.id, -5, activeTopic.id)}
                                    title="Deduct -5"
                                  >
                                    -5
                                  </button>
                                  <button
                                    type="button"
                                    className="pill-btn neg"
                                    onClick={() => handleSaveSpeechMark(team.id, -10, activeTopic.id)}
                                    title="Deduct -10"
                                  >
                                    -10
                                  </button>
                                  <input
                                    type="number"
                                    style={{
                                      width: 58,
                                      padding: '4px 6px',
                                      textAlign: 'center',
                                      borderRadius: 6,
                                      border: '1px solid #474061',
                                      background: '#101426',
                                      color: '#fff',
                                      fontSize: 11
                                    }}
                                    value={draftVal}
                                    onChange={(e) => setSpeechMarksDraft({
                                      ...speechMarksDraft,
                                      [draftKey]: e.target.value
                                    })}
                                    placeholder="± pts"
                                  />
                                  <button
                                    type="button"
                                    className="primary small"
                                    style={{ padding: '4px 9px', fontSize: 10 }}
                                    onClick={() => handleSaveSpeechMark(team.id, Number(draftVal), activeTopic.id)}
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })() : (
                  <div className="empty-live">
                    <div className="empty-icon orange"><Clock3 size={25} /></div>
                    <b>Ready for the next speaker?</b>
                    <span>Assign a topic on the left and start their turn.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="section-heading">
              <div>
                <span className="section-kicker">ROUND QUEUE</span>
                <h2>Participant topics <span className="count-badge">{topics.length}</span></h2>
              </div>
            </div>

            <div className="topic-list">
              {topics.map((topic) => {
                const topicTeam = teams.find((team) => team.members?.some((member) => member.id === topic.user_id));
                return (
                  <div className="topic-row" key={topic.id}>
                    <div className="topic-symbol"><MessageSquareText size={18} /></div>
                    <div className="topic-player">
                      <b>{topic.username}</b>
                      <small>
                        {topicTeam?.name || 'No team assigned'}
                      </small>
                    </div>
                    <div className="topic-secret"><Lock size={13} /><span>{topic.text || 'Private topic'}</span></div>
                    <span className={`status-tag ${topic.status === 'active' ? 'on' : ''}`}>
                      <i /> {topic.status}
                    </span>
                    <div className="q-actions">
                      {topic.status !== 'active' && topic.status !== 'completed' && (
                        <button
                          className="primary small"
                          disabled={!act('lightning-speech')?.unlocked || Boolean(activeTopic) || busy}
                          onClick={() => run(
                            () => api(`/api/lightning/topics/${topic.id}/unlock`, { method: 'POST' }),
                            `${topic.username}'s turn started`
                          )}
                        >
                          <Play size={13} /> Start turn
                        </button>
                      )}
                      <button
                        className="secondary small btn-delete"
                        onClick={() => {
                          if (window.confirm(`Delete topic for "${topic.username}"? This cannot be undone.`)) {
                            run(
                              () => api(`/api/lightning/topics/${topic.id}`, { method: 'DELETE' }),
                              `Topic for ${topic.username} deleted`
                            );
                          }
                        }}
                        disabled={busy}
                        title="Delete this topic"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
              {!topics.length && <div className="panel empty-inline">No participant topics assigned yet.</div>}
            </div>

            {/* Direct Score / Completed Topics Scoring */}
            <div className="section-heading" style={{ marginTop: 24 }}>
              <div>
                <span className="section-kicker">SCORING</span>
                <h2>Score Lightning Speech <span className="count-badge">{topics.filter(t => t.status === 'completed' || t.status === 'active').length}</span></h2>
              </div>
            </div>

            <div className="panel">
              {topics.filter(t => t.status === 'completed').length > 0 ? (
                topics.filter(t => t.status === 'completed').map((topic) => (
                  <div key={topic.id} style={{ marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid #282e44' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <MessageSquareText size={16} color="#fb923c" />
                      <b style={{ fontSize: 13 }}>{topic.username}'s Completed Speech: “{topic.text}”</b>
                      <span className="status-tag" style={{ marginLeft: 'auto' }}>
                        completed
                      </span>
                    </div>

                    <div className="live-scoring-card" style={{ marginTop: 8 }}>
                      <div className="scoring-head">
                        <div>
                          <h4>Score {topic.username}'s Turn (Leaderboard updates instantly)</h4>
                          <span className="subtle">Enter marks (+ or - e.g. +10, -5).</span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gap: 8 }}>
                        {teams.map((team) => {
                          const scoreObj = scores.find(
                            (s) => s.team_id === team.id && s.round_key === `speech:${topic.id}`
                          );
                          const currentMark = scoreObj ? scoreObj.points : null;
                          const draftKey = `${team.id}:speech:${topic.id}`;
                          const draftVal = speechMarksDraft[draftKey] ?? (currentMark !== null ? String(currentMark) : '10');

                          return (
                            <div key={team.id} className="score-badge-row">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                <Crown size={14} color="#a78bfa" />
                                <b style={{ fontSize: 12 }}>{team.name}</b>
                                {currentMark !== null && (
                                  <span className={`points-pill ${currentMark >= 0 ? 'pos' : 'neg'}`}>
                                    {currentMark > 0 ? `+${currentMark}` : currentMark} pts
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <button
                                  type="button"
                                  className="pill-btn pos"
                                  onClick={() => handleSaveSpeechMark(team.id, 10, topic.id)}
                                >
                                  +10
                                </button>
                                <button
                                  type="button"
                                  className="pill-btn pos"
                                  onClick={() => handleSaveSpeechMark(team.id, 5, topic.id)}
                                >
                                  +5
                                </button>
                                <button
                                  type="button"
                                  className="pill-btn neg"
                                  onClick={() => handleSaveSpeechMark(team.id, -5, topic.id)}
                                >
                                  -5
                                </button>
                                <button
                                  type="button"
                                  className="pill-btn neg"
                                  onClick={() => handleSaveSpeechMark(team.id, -10, topic.id)}
                                >
                                  -10
                                </button>
                                <input
                                  type="number"
                                  style={{
                                    width: 58,
                                    padding: '4px 6px',
                                    textAlign: 'center',
                                    borderRadius: 6,
                                    border: '1px solid #474061',
                                    background: '#101426',
                                    color: '#fff',
                                    fontSize: 11
                                  }}
                                  value={draftVal}
                                  onChange={(e) => setSpeechMarksDraft({
                                    ...speechMarksDraft,
                                    [draftKey]: e.target.value
                                  })}
                                  placeholder="± pts"
                                />
                                <button
                                  type="button"
                                  className="primary small"
                                  style={{ padding: '4px 9px', fontSize: 10 }}
                                  onClick={() => handleSaveSpeechMark(team.id, Number(draftVal), topic.id)}
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="muted" style={{ padding: '8px 0' }}>
                  No completed topics to score yet. Start a speaker turn or score the live turn above.
                </div>
              )}
            </div>

            {/* Speech Leaderboard — always displayed and updating in real time */}
            <div className="section-heading" style={{ marginTop: 24 }}>
              <div>
                <span className="section-kicker">STANDINGS</span>
                <h2>Speech Leaderboard</h2>
              </div>
            </div>

            <div className="panel table-panel">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 70 }}>RANK</th>
                      <th>TEAM</th>
                      <th>SPEECH SCORES BREAKDOWN</th>
                      <th style={{ textAlign: 'right', width: 110 }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const speechScores = scores.filter((s) => s.activity_key === 'lightning-speech');
                      const teamTotals = teams.map((team) => {
                        const teamSpeechScores = speechScores.filter((s) => s.team_id === team.id);
                        const total = teamSpeechScores.reduce((sum, s) => sum + s.points, 0);
                        return { ...team, speechScores: teamSpeechScores, total };
                      }).sort((a, b) => b.total - a.total);

                      return teamTotals.length ? teamTotals.map((row, index) => (
                        <tr key={row.id}>
                          <td><span className={`rank-badge ${index === 0 ? 'rank-1' : ''}`}>{index + 1}</span></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Crown size={15} color="#a78bfa" />
                              <b>{row.name}</b>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              {row.speechScores.length > 0 ? (
                                row.speechScores.map((s, idx) => {
                                  const topicMatch = topics.find(t => s.round_key === `speech:${t.id}`);
                                  const label = topicMatch ? topicMatch.username : s.round_key;
                                  return (
                                    <span
                                      key={idx}
                                      className={`points-pill ${s.points >= 0 ? 'pos' : 'neg'}`}
                                      title={`${label}: ${s.points} pts`}
                                    >
                                      {label}: {s.points >= 0 ? `+${s.points}` : s.points}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="muted" style={{ fontSize: 10 }}>No speech scores yet</span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <b style={{ fontSize: 16, color: row.total >= 0 ? '#4ade80' : '#f87171' }}>
                              {row.total >= 0 ? `+${row.total}` : row.total}
                            </b>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="4">No teams or speech scores recorded yet.</td></tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="callout orange-callout" style={{ marginTop: 16 }}>
              <Bell size={18} />
              <div>
                <b>How the round works</b>
                <p>Assign a topic, start the turn, and let the timer finish. Then select the next participant. Speech is never recorded.</p>
              </div>
            </div>
          </>
        ) : (
          <div className="panel participant-speech">
            {myTopic ? (
              <>
                <div className="eyebrow">YOUR SPEAKING TURN</div>
                {myTopic.status === 'active' ? (
                  <>
                    <div className="secret-card">
                      <span>YOUR TOPIC</span>
                      <h2>{myTopic.text}</h2>
                    </div>
                    <div className="speech-countdown">
                      <strong>
                        {formatCountdown(
                          myTopic.ends_at
                            ? Math.max(0, Math.ceil((new Date(myTopic.ends_at).getTime() - clockNow) / 1000))
                            : 0
                        )}
                      </strong>
                      <small>TIME REMAINING</small>
                    </div>
                    <p className="muted">Speak clearly. Your speech is not recorded.</p>
                  </>
                ) : myTopic.status === 'completed' ? (
                  <div className="empty-live">
                    <Check size={24} />
                    <b>Your turn is complete</b>
                    <span>Please wait for the event administrator.</span>
                  </div>
                ) : (
                  <div className="empty-live">
                    <Clock3 size={24} />
                    <b>Your topic is ready</b>
                    <span>The administrator will start your turn when it is your time.</span>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-live">
                <MessageSquareText size={25} />
                <b>No topic assigned yet</b>
                <span>Please wait for the administrator to assign your speaking topic.</span>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  const renderFindObject = () => {
    const findObjActObj = act('find-object') || { key: 'find-object', duration_seconds: 60, name: 'Find the Object' };
    const findObjQuestions = questions.filter(q => (q.activity_key || 'find-object') === 'find-object');
    const currentQ = findObjQuestions.find((q) => q.status === 'active') || null;

    return (
      <>
        <div className="page-intro">
          <div>
            <div className="eyebrow">GAME 01 · VISUAL PUZZLE</div>
            <div className="title-rename-wrap">
              <h1>{findObjActObj.name || 'Find the Object'}<span>.</span></h1>
              {isAdmin && (
                <button
                  className="btn-inline-rename"
                  type="button"
                  onClick={() => {
                    const currentName = findObjActObj.name || 'Find the Object';
                    const newName = window.prompt('Enter new name for Find the Object:', currentName);
                    if (newName && newName.trim() && newName.trim() !== currentName) {
                      run(
                        () => api('/api/activities/find-object/rename', {
                          method: 'PATCH',
                          body: JSON.stringify({ name: newName.trim() })
                        }),
                        `Activity renamed to "${newName.trim()}"`
                      );
                    }
                  }}
                  title="Rename activity"
                >
                  <Pencil size={12} /> Rename
                </button>
              )}
            </div>
            <p>Manage clue images, publish questions, and review team submissions.</p>
          </div>
        </div>

      {isAdmin && (
        <div className="split-layout">
          <div className="panel">
            <div className="panel-head">
              <div><h3>Create a question</h3><p>Upload clue images for teams to identify.</p></div>
              <div className="step-badge">01 / CREATE</div>
            </div>

            <form onSubmit={(event) => {
              event.preventDefault();
              run(async () => {
                const question = await api('/api/questions', {
                  method: 'POST',
                  body: JSON.stringify({
                    number: Number(qNumber),
                    answer: qAnswer.trim(),
                    hint: qHint.trim() || null
                  })
                });

                if (qFiles.length) {
                  const formData = new FormData();
                  qFiles.forEach((file) => formData.append('files', file));
                  await api(`/api/questions/${question.id}/images`, {
                    method: 'POST',
                    body: formData
                  });
                }

                setQAnswer('');
                setQHint('');
                setQFiles([]);
                setQNumber(String(Number(qNumber) + 1));
              }, 'Question created successfully');
            }}>
              <div className="form-row">
                <div className="field">
                  <label>QUESTION NUMBER</label>
                  <input type="number" min="1" value={qNumber} onChange={(event) => setQNumber(event.target.value)} required />
                </div>
                <div className="field">
                  <label>CORRECT ANSWER <span className="private-label"><Lock size={11} /> ADMIN ONLY</span></label>
                  <input value={qAnswer} onChange={(event) => setQAnswer(event.target.value)} placeholder="e.g. Docker" required />
                </div>
              </div>

              <div className="field">
                <label>OPTIONAL HINT</label>
                <input value={qHint} onChange={(event) => setQHint(event.target.value)} placeholder="A little nudge for the teams…" />
              </div>

              <div
                className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                style={{
                  position: 'relative',
                  border: isDragging ? '2px dashed var(--purple)' : '1px dashed #4a4165',
                  background: isDragging ? '#272045' : 'linear-gradient(140deg,#201c34,#191d30)',
                  transition: '0.2s',
                  cursor: 'pointer'
                }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'));
                  if (files.length) {
                    setQFiles((prev) => [...prev, ...files].slice(0, 10));
                  }
                }}
                onClick={() => document.getElementById('q-file-input')?.click()}
              >
                <input
                  id="q-file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    if (files.length) {
                      setQFiles((prev) => [...prev, ...files].slice(0, 10));
                    }
                  }}
                />
                <div className="upload-icon"><CloudUpload size={24} /></div>
                <b>Drop your clue images here or click to browse</b>
                <span>PNG, JPG, WEBP, or GIF supported</span>
                <small>{qFiles.length ? `${qFiles.length} image(s) selected` : 'Select 1 or more images'}</small>

                {qFiles.length > 0 && (
                  <div
                    className="file-pills"
                    style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, justifyContent: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {qFiles.map((file, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: '#2d2448',
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 10
                        }}
                      >
                        <ImageIcon size={12} />
                        <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQFiles(qFiles.filter((_, i) => i !== idx))}
                          style={{ border: 0, background: 'transparent', color: '#ff8888', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button className="primary" type="submit" disabled={busy || qFiles.length < 1}>
                <Plus size={16} /> Save question ({qFiles.length} image{qFiles.length === 1 ? '' : 's'})
              </button>
            </form>
          </div>

          <div className="panel active-question-panel">
            <div className="panel-head">
              <div><h3>Live question</h3><p>What participants see right now</p></div>
              <span className={`status-tag ${currentQ ? 'on' : ''}`}><i />{currentQ ? 'LIVE' : 'WAITING'}</span>
            </div>

            {currentQ ? (() => {
              const currentBuzzers = buzzers
                .filter((b) => b.round_key === `object:${currentQ.id}`)
                .sort((a, b) => a.position - b.position);
              const qEndsAtMs = currentQ.ends_at ? new Date(currentQ.ends_at).getTime() : null;
              const qSecondsLeft = qEndsAtMs ? Math.max(0, Math.ceil((qEndsAtMs - clockNow) / 1000)) : 0;
              const qDuration = act('find-object')?.duration_seconds || 60;
              const qPercent = qEndsAtMs ? Math.min(100, Math.max(0, (qSecondsLeft / qDuration) * 100)) : 0;

              return (
                <>
                  <div className="live-question-number">QUESTION <b>{currentQ.number}</b></div>
                  <div className="question-images">
                    {(currentQ.images || []).map((image) => (
                      <img key={image} src={`${API}${image}`} alt="Question clue" />
                    ))}
                    {!currentQ.images?.length && <div className="muted" style={{ padding: 10 }}>No images uploaded for this question</div>}
                  </div>

                  <div className="timer-display" style={{ display: 'grid', gap: 6, margin: '14px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock3 size={18} color={qSecondsLeft <= 5 && qSecondsLeft > 0 ? '#fb923c' : qSecondsLeft === 0 ? '#ef4444' : '#a78bfa'} />
                        <b style={{ fontSize: 18, color: qSecondsLeft === 0 ? '#ef4444' : '#f8fafc' }}>
                          {currentQ.ends_at ? (qSecondsLeft > 0 ? `${qSecondsLeft}s remaining` : 'TIME EXPIRED (0s)') : '—'}
                        </b>
                      </div>
                      <small style={{ color: '#8c95af' }}>
                        {qSecondsLeft > 0 ? `${qSecondsLeft}s left in round` : 'Round ended'}
                      </small>
                    </div>
                    {currentQ.ends_at && (
                      <div style={{ width: '100%', height: 5, background: '#22283e', borderRadius: 3, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${qPercent}%`,
                            height: '100%',
                            background: qSecondsLeft <= 5 ? '#ef4444' : 'linear-gradient(90deg, #a78bfa, #ec4899)',
                            transition: 'width 1s linear'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      className="secondary"
                      style={{ flex: 1 }}
                      onClick={() => run(
                        () => api(`/api/questions/${currentQ.id}/lock`, { method: 'POST' }),
                        `Question ${currentQ.number} locked`
                      )}
                    >
                      <Lock size={14} /> Lock
                    </button>
                    <button
                      className="secondary"
                      style={{ flex: 1 }}
                      onClick={() => run(
                        () => api(`/api/questions/${currentQ.id}/close`, { method: 'POST' }),
                        `Question ${currentQ.number} closed`
                      )}
                    >
                      <Square size={14} /> Close
                    </button>
                    <button
                      className="secondary"
                      style={{ flex: 1 }}
                      onClick={() => handleExtendQuestion(currentQ.id, currentQ.number)}
                      title="Add 30 seconds to the timer"
                    >
                      <Plus size={14} /> +30s Extend
                    </button>
                    <button
                      className="secondary btn-delete"
                      style={{ flex: 1 }}
                      onClick={() => {
                        if (window.confirm(`Delete Question ${currentQ.number}? This will permanently remove its clues and submissions.`)) {
                          run(async () => {
                            await api(`/api/questions/${currentQ.id}`, { method: 'DELETE' });
                            setCurrentQ(null);
                          }, `Question ${currentQ.number} deleted`);
                        }
                      }}
                      title="Delete question"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>

                  {/* Live Buzzers list for this question */}
                  <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #282e44' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Radio size={16} color="#fb923c" />
                        <b style={{ fontSize: 12 }}>Buzzers for Question {currentQ.number}</b>
                        <span className="count-badge">{currentBuzzers.length}</span>
                      </div>
                      {currentBuzzers.length > 0 && (
                        <button
                          className="secondary small btn-delete"
                          onClick={() => {
                            if (window.confirm(`Clear buzzers for Question ${currentQ.number}? Count will reset to 0.`)) {
                              run(
                                () => api(`/api/buzzers/reset?round_key=object:${currentQ.id}`, { method: 'POST' }),
                                `Buzzer log cleared for Question ${currentQ.number}`
                              );
                            }
                          }}
                        >
                          <Trash2 size={12} /> Reset to 0
                        </button>
                      )}
                    </div>

                    {currentBuzzers.length ? (
                      <div className="live-buzzers-queue" style={{ margin: 0 }}>
                        <div className="queue-items">
                          {currentBuzzers.map((b) => (
                            <div key={b.id} className={`queue-chip ${b.position === 1 ? 'first-buzz' : ''}`}>
                              <span className="pos">#{b.position}</span>
                              <b>{b.team_name}</b>
                              {b.username && <small>({b.username})</small>}
                              {b.position === 1 && <span className="winner-tag">1ST BUZZ</span>}
                              <div style={{ display: 'inline-flex', gap: 4, marginLeft: 6 }}>
                                <button
                                  type="button"
                                  className="pill-btn pos"
                                  title="Award +10 marks to this team"
                                  onClick={() => handleSaveMark(b.team_id, 10, currentQ.id)}
                                >
                                  +10
                                </button>
                                <button
                                  type="button"
                                  className="pill-btn neg"
                                  title="Deduct -5 marks from this team"
                                  onClick={() => handleSaveMark(b.team_id, -5, currentQ.id)}
                                >
                                  -5
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="muted" style={{ margin: 0 }}>
                        No team has pressed the buzzer yet for Question {currentQ.number}. (Buzzer count: 0)
                      </p>
                    )}
                  </div>

                  {/* Question Scoring section for Admin */}
                  <div className="live-scoring-card" style={{ marginTop: 18 }}>
                    <div className="scoring-head">
                      <div>
                        <h4>Score Question {currentQ.number} (Leaderboard updates instantly)</h4>
                        <span className="subtle">Enter marks (+ or - e.g. +10, -5).</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                      {teams.map((team) => {
                        const scoreObj = scores.find(
                          (s) => s.team_id === team.id && s.round_key === `object:${currentQ.id}`
                        );
                        const currentMark = scoreObj ? scoreObj.points : null;
                        const draftKey = `${team.id}:${currentQ.id}`;
                        const draftVal = questionMarksDraft[draftKey] ?? (currentMark !== null ? String(currentMark) : '10');

                        return (
                          <div key={team.id} className="score-badge-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                              <Crown size={14} color="#a78bfa" />
                              <b style={{ fontSize: 12 }}>{team.name}</b>
                              {currentMark !== null && (
                                <span className={`points-pill ${currentMark >= 0 ? 'pos' : 'neg'}`}>
                                  {currentMark > 0 ? `+${currentMark}` : currentMark} pts
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <button
                                type="button"
                                className="pill-btn pos"
                                onClick={() => handleSaveMark(team.id, 10, currentQ.id)}
                                title="Give +10"
                              >
                                +10
                              </button>
                              <button
                                type="button"
                                className="pill-btn pos"
                                onClick={() => handleSaveMark(team.id, 5, currentQ.id)}
                                title="Give +5"
                              >
                                +5
                              </button>
                              <button
                                type="button"
                                className="pill-btn neg"
                                onClick={() => handleSaveMark(team.id, -5, currentQ.id)}
                                title="Deduct -5"
                              >
                                -5
                              </button>
                              <button
                                type="button"
                                className="pill-btn neg"
                                onClick={() => handleSaveMark(team.id, -10, currentQ.id)}
                                title="Deduct -10"
                              >
                                -10
                              </button>
                              <input
                                type="number"
                                style={{
                                  width: 58,
                                  padding: '4px 6px',
                                  textAlign: 'center',
                                  borderRadius: 6,
                                  border: '1px solid #474061',
                                  background: '#101426',
                                  color: '#fff',
                                  fontSize: 11
                                }}
                                value={draftVal}
                                onChange={(e) => setQuestionMarksDraft({
                                  ...questionMarksDraft,
                                  [draftKey]: e.target.value
                                })}
                                placeholder="± pts"
                              />
                              <button
                                type="button"
                                className="primary small"
                                style={{ padding: '4px 9px', fontSize: 10 }}
                                onClick={() => handleSaveMark(team.id, Number(draftVal), currentQ.id)}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {!teams.length && (
                        <div className="muted" style={{ padding: 8 }}>
                          No teams formed yet. Go to Teams page to create teams first.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })() : (
              <div className="empty-live">
                <div className="empty-icon"><ImageIcon size={25} /></div>
                <b>No question is live</b>
                <span>Unlock a prepared question below.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="panel" style={{ marginBottom: 28 }}>
          <div className="panel-head">
            <div>
              <h3>Live Competition · Visual Puzzle</h3>
              <p>Identify the tech object from clue images, press the buzzer, and submit your team's answer.</p>
            </div>
            <span className={`status-tag ${currentQ ? 'on' : ''}`}>
              <i />{currentQ ? 'ACTIVE QUESTION' : 'WAITING FOR QUESTION'}
            </span>
          </div>

          {currentQ ? (() => {
            const currentBuzzers = buzzers
              .filter((b) => b.round_key === `object:${currentQ.id}`)
              .sort((a, b) => a.position - b.position);
            const myTeam = teams.find((t) => t.members?.some((m) => m.id === me?.id));
            const myBuzzer = currentBuzzers.find((b) => b.team_id === myTeam?.id);
            const qEndsAtMs = currentQ.ends_at ? new Date(currentQ.ends_at).getTime() : null;
            const qSecondsLeft = qEndsAtMs ? Math.max(0, Math.ceil((qEndsAtMs - clockNow) / 1000)) : 0;
            const qDuration = act('find-object')?.duration_seconds || 60;
            const qPercent = qEndsAtMs ? Math.min(100, Math.max(0, (qSecondsLeft / qDuration) * 100)) : 0;

            return (
              <div>
                <div className="live-question-number">QUESTION <b>{currentQ.number}</b></div>
                <div className="question-images">
                  {(currentQ.images || []).map((image) => (
                    <img key={image} src={`${API}${image}`} alt="Question clue" />
                  ))}
                  {!currentQ.images?.length && <div className="muted" style={{ padding: 10 }}>No clue images yet.</div>}
                </div>

                {currentQ.hint && (
                  <div className="callout" style={{ margin: '14px 0' }}>
                    <Sparkles size={16} />
                    <div><b>Clue Hint:</b> <p>{currentQ.hint}</p></div>
                  </div>
                )}

                {/* Remaining Timer Display for User */}
                <div className="timer-display" style={{ display: 'grid', gap: 6, margin: '14px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock3 size={18} color={qSecondsLeft <= 5 && qSecondsLeft > 0 ? '#fb923c' : qSecondsLeft === 0 ? '#ef4444' : '#a78bfa'} />
                      <b style={{ fontSize: 18, color: qSecondsLeft === 0 ? '#ef4444' : '#f8fafc' }}>
                        {currentQ.ends_at ? (qSecondsLeft > 0 ? `${qSecondsLeft}s remaining` : 'TIME EXPIRED!') : 'Waiting for timer'}
                      </b>
                    </div>
                    <small style={{ color: '#8c95af' }}>
                      {qSecondsLeft > 0 ? 'Be fast to slam the buzzer' : 'Round ended'}
                    </small>
                  </div>
                  {currentQ.ends_at && (
                    <div style={{ width: '100%', height: 5, background: '#22283e', borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${qPercent}%`,
                          height: '100%',
                          background: qSecondsLeft <= 5 ? '#ef4444' : 'linear-gradient(90deg, #a78bfa, #ec4899)',
                          transition: 'width 1s linear'
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Buzzer Button & Counter directly on the question page */}
                <div style={{ margin: '18px 0' }}>
                  <div className="buzzer-counter-badge">
                    <Radio size={16} />
                    <span>Buzzer entries for Question {currentQ.number}:</span>
                    <b>{currentBuzzers.length}</b>
                  </div>

                  <button
                    type="button"
                    className={`buzzer-button big-buzzer ${myBuzzer ? 'buzzed' : ''}`}
                    disabled={busy || myBuzzer || !myTeam}
                    onClick={() => handlePressBuzzer(`object:${currentQ.id}`, 'find-object')}
                    style={{ minHeight: 74 }}
                  >
                    <Radio size={26} />
                    <span>
                      {myBuzzer
                        ? `BUZZED! POSITION #${myBuzzer.position}`
                        : !myTeam
                        ? 'JOIN A TEAM TO BUZZ'
                        : 'SLAM THE BUZZER!'}
                    </span>
                  </button>

                  {!myTeam && (
                    <div style={{ marginTop: 8 }}>
                      <p className="muted" style={{ margin: 0 }}>
                        You must join or be assigned to a team before you can press the buzzer.
                      </p>
                      <button
                        type="button"
                        className="secondary small"
                        style={{ marginTop: 6 }}
                        onClick={() => setPage('Teams')}
                      >
                        <Crown size={13} /> Go to Teams page
                      </button>
                    </div>
                  )}

                  {/* Live buzzer queue for this question */}
                  {currentBuzzers.length > 0 && (
                    <div className="live-buzzers-queue" style={{ marginTop: 14 }}>
                      <div className="queue-title">BUZZER ORDER FOR THIS QUESTION</div>
                      <div className="queue-items">
                        {currentBuzzers.map((b) => (
                          <div key={b.id} className={`queue-chip ${b.position === 1 ? 'first-buzz' : ''}`}>
                            <span className="pos">#{b.position}</span>
                            <b>{b.team_name}</b>
                            {b.username && <small>({b.username})</small>}
                            {b.position === 1 && <span className="winner-tag">1ST BUZZ</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!teamAnswer.trim()) return;
                    run(async () => {
                      await api('/api/submissions', {
                        method: 'POST',
                        body: JSON.stringify({
                          question_id: currentQ.id,
                          answer_text: teamAnswer.trim()
                        })
                      });
                      setTeamAnswer('');
                    }, 'Answer submitted to admin!');
                  }}
                  className="answer-form"
                  style={{ marginTop: 14 }}
                >
                  <input
                    value={teamAnswer}
                    onChange={(e) => setTeamAnswer(e.target.value)}
                    placeholder="Type your team's answer (e.g. Docker, Kubernetes)..."
                    disabled={busy}
                    required
                  />
                  <button className="primary" type="submit" disabled={busy || !teamAnswer.trim()}>
                    <Send size={15} /> Submit
                  </button>
                </form>
              </div>
            );
          })() : (
            <div className="empty-live">
              <div className="empty-icon"><ImageIcon size={25} /></div>
              <b>No question is live right now</b>
              <span>The administrator will unlock a question soon. Stand by!</span>
            </div>
          )}
        </div>
      )}

      <div className="section-heading">
        <div>
          <span className="section-kicker">QUESTION BANK</span>
          <h2>Prepared questions <span className="count-badge">{findObjQuestions.length}</span></h2>
        </div>
      </div>

      <div className="question-bank">
        {findObjQuestions.map((question) => (
          <div className="question-row" key={question.id} style={{ alignItems: 'flex-start' }}>
            <div className="q-number">Q{String(question.number).padStart(2, '0')}</div>
            <div className="q-main">
              <b>Question {question.number}</b>
              <small>
                {question.images?.length || 0} image clue{question.images?.length === 1 ? '' : 's'}
                {isAdmin ? ` · Answer: ${question.answer || 'Hidden from participants'}` : ''}
                {question.hint ? ` · Hint: ${question.hint}` : ''}
              </small>

              {question.images && question.images.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {question.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={`${API}${img}`}
                      alt="Clue clue"
                      style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #353b51' }}
                    />
                  ))}
                </div>
              )}
            </div>

            <span className={`status-tag ${question.status === 'active' ? 'on' : ''}`}>
              <i /> {question.status}
            </span>

            {isAdmin && (
              <div className="q-actions" style={{ marginLeft: 'auto' }}>
                <label
                  className="secondary small"
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  title="Upload more images to this question"
                >
                  <CloudUpload size={13} />
                  <span>+ Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      const formData = new FormData();
                      files.forEach((f) => formData.append('files', f));
                      run(async () => {
                        await api(`/api/questions/${question.id}/images`, {
                          method: 'POST',
                          body: formData
                        });
                      }, `Images uploaded to Question ${question.number}`);
                    }}
                  />
                </label>

                {question.status !== 'active' && (
                  <button
                    className="primary small"
                    disabled={busy}
                    onClick={() => handleUnlockQuestion(question.id, question.number)}
                    title="Unlock this question and start the countdown timer"
                  >
                    <Play size={13} /> Unlock
                  </button>
                )}
                {question.status === 'active' && (
                  <>
                    <button
                      className="secondary small"
                      onClick={() => run(
                        () => api(`/api/questions/${question.id}/lock`, { method: 'POST' }),
                        `Question ${question.number} locked`
                      )}
                      title="Lock this question individually"
                    >
                      <Lock size={13} /> Lock
                    </button>
                    <button
                      className="secondary small"
                      onClick={() => run(
                        () => api(`/api/questions/${question.id}/close`, { method: 'POST' }),
                        `Question ${question.number} closed`
                      )}
                      title="Close question"
                    >
                      <Square size={13} /> Close
                    </button>
                  </>
                )}
                <button
                  className="secondary small btn-delete"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete Question ${question.number}? All its clue images and submissions will be permanently deleted.`)) {
                      run(async () => {
                        await api(`/api/questions/${question.id}`, { method: 'DELETE' });
                        if (currentQ?.id === question.id) setCurrentQ(null);
                      }, `Question ${question.number} deleted`);
                    }
                  }}
                  title="Delete this question"
                >
                  <Trash2 size={13} /> Delete
                </button>
                <button className="secondary small" onClick={() => loadBuzzers(`object:${question.id}`)}>
                  Buzzer log
                </button>
              </div>
            )}
          </div>
        ))}
        {!findObjQuestions.length && <div className="panel empty-inline">No questions prepared yet.</div>}
      </div>

      {isAdmin && (
        <>
          <div className="section-heading">
            <div>
              <span className="section-kicker">INCOMING ANSWERS</span>
              <h2>Team submissions <span className="count-badge">{submissions.length}</span></h2>
            </div>
          </div>

          <div className="panel">
            <div className="submission-list">
              {submissions.length ? submissions.map((submission) => (
                <div className="submission-row" key={submission.id}>
                  <div className="submission-avatar"><MessageSquareText size={17} /></div>
                  <div className="submission-copy">
                    <b>{submission.team_name} <span>· {submission.username}</span></b>
                    <p>“{submission.answer_text}”</p>
                    <small>
                      Question {submission.question_number} · {new Date(submission.submitted_at).toLocaleTimeString()}
                    </small>
                  </div>
                  <span className={`status-tag ${submission.status === 'correct' ? 'on' : submission.status === 'skipped' ? '' : 'pending'}`}>
                    <i /> {submission.status}
                  </span>
                  <div className="eval-actions">
                    <input
                      type="number"
                      value={scoreDraft[submission.id] ?? 10}
                      onChange={(event) => setScoreDraft({ ...scoreDraft, [submission.id]: event.target.value })}
                      title="Points (+ or -)"
                      placeholder="± pts"
                      style={{ width: 62 }}
                    />
                    <button
                      className="success-btn"
                      disabled={submission.status !== 'pending'}
                      onClick={() => run(
                        () => api(`/api/submissions/${submission.id}/evaluate`, {
                          method: 'POST',
                          body: JSON.stringify({
                            status: 'correct',
                            points: Number(scoreDraft[submission.id] ?? 10)
                          })
                        }),
                        'Correct answer confirmed and points updated in Leaderboard!'
                      )}
                    >
                      Correct
                    </button>
                    <button
                      className="secondary small"
                      disabled={submission.status !== 'pending'}
                      onClick={() => {
                        const penalty = scoreDraft[submission.id] !== undefined ? Number(scoreDraft[submission.id]) : 0;
                        run(
                          () => api(`/api/submissions/${submission.id}/evaluate`, {
                            method: 'POST',
                            body: JSON.stringify({ status: 'incorrect', points: penalty })
                          }),
                          `Marked incorrect (${penalty >= 0 ? '+' : ''}${penalty} pts)`
                        );
                      }}
                    >
                      Incorrect
                    </button>
                  </div>
                </div>
              )) : <div className="empty-inline">No answers submitted yet.</div>}
            </div>
          </div>
        </>
      )}
    </>
  );
};

const renderCustomActivity = (activity) => {
    const actQuestions = questions.filter((q) => q.activity_key === activity.key);
    const activeQ = actQuestions.find((q) => q.status === 'active') || null;
    const duration = activity.duration_seconds || 60;
    const inputType = activity.input_type || 'image';
    const questionMode = activity.question_mode || 'team';
    const questionType = activity.question_type || 'buzzer';
    const myTeam = teams.find((t) => t.members?.some((m) => m.id === me?.id));
    const nextQNum = actQuestions.length > 0 ? Math.max(...actQuestions.map((q) => q.number || 0)) + 1 : 1;

    return (
      <>
        <div className="page-intro">
          <div>
            <div className="eyebrow">
              CUSTOM ACTIVITY · {inputType.toUpperCase()} · {questionMode === 'member' ? 'PER MEMBER' : 'PER TEAM'}
            </div>
            <div className="title-rename-wrap">
              <h1>{activity.name}<span>.</span></h1>
              {isAdmin && (
                <button
                  className="btn-inline-rename"
                  type="button"
                  onClick={() => {
                    const newName = window.prompt(`Enter new name for ${activity.name}:`, activity.name);
                    if (newName && newName.trim() && newName.trim() !== activity.name) {
                      run(
                        () => api(`/api/activities/${activity.key}/rename`, {
                          method: 'PATCH',
                          body: JSON.stringify({ name: newName.trim() })
                        }),
                        `Activity renamed to "${newName.trim()}"`
                      );
                    }
                  }}
                  title="Rename activity"
                >
                  <Pencil size={12} /> Rename
                </button>
              )}
            </div>
            <p>
              Mode: {questionMode === 'member' ? 'All team members receive a question' : 'One question per team'} · Input: {inputType} · Type: {questionType}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="inline-stat orange">
              <Clock3 size={17} /><span>Timer</span>
              <b>{duration}s</b>
            </div>
            {isAdmin && (
              <>
                <button
                  className={activity.unlocked ? 'secondary small' : 'primary small'}
                  onClick={() => run(
                    () => api(`/api/activities/${activity.key}/${activity.unlocked ? 'lock' : 'unlock'}`, { method: 'POST' }),
                    activity.unlocked ? `${activity.name} locked` : `${activity.name} unlocked for participants`
                  )}
                  title={activity.unlocked ? 'Lock activity from participants' : 'Unlock activity for participants'}
                >
                  {activity.unlocked ? <Lock size={13} /> : <Play size={13} />}
                  <span>{activity.unlocked ? 'Lock Game' : 'Unlock Game'}</span>
                </button>
                <button
                  className="secondary small btn-delete"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete activity "${activity.name}"? All its questions, submissions, and scores will be permanently deleted.`)) {
                      run(async () => {
                        await api(`/api/activities/${activity.key}`, { method: 'DELETE' });
                        setPage('Overview');
                      }, `Activity "${activity.name}" deleted`);
                    }
                  }}
                  title="Delete activity"
                >
                  <Trash2 size={13} /> Delete Activity
                </button>
              </>
            )}
          </div>
        </div>

        {isAdmin ? (
          <>
            <div className="split-layout">
              {/* Left Column: Create Question for this Activity */}
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Create a question</h3>
                    <p>Add a {inputType} challenge for this round.</p>
                  </div>
                  <div className="step-badge">01 / CREATE</div>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    const qData = await api('/api/questions', {
                      method: 'POST',
                      body: JSON.stringify({
                        activity_key: activity.key,
                        number: Number(customQNumber) || nextQNum,
                        prompt: customQPrompt.trim() || undefined,
                        answer: customQAnswer.trim() || undefined,
                        hint: customQHint.trim() || undefined,
                        target_user_id: questionMode === 'member' && customQTargetUser ? Number(customQTargetUser) : undefined,
                        target_team_id: questionMode === 'team' && customQTargetTeam ? Number(customQTargetTeam) : undefined
                      })
                    });

                    if (customQFiles.length > 0 && qData?.id) {
                      const formData = new FormData();
                      customQFiles.forEach((f) => formData.append('files', f));
                      await api(`/api/questions/${qData.id}/images`, {
                        method: 'POST',
                        body: formData
                      });
                    }

                    setCustomQPrompt('');
                    setCustomQAnswer('');
                    setCustomQHint('');
                    setCustomQTargetUser('');
                    setCustomQTargetTeam('');
                    setCustomQFiles([]);
                    setCustomQNumber(String((Number(customQNumber) || nextQNum) + 1));
                  }, `Question added to ${activity.name}!`);
                }}>
                  <div className="form-row">
                    <div className="field" style={{ flex: 1 }}>
                      <label>QUESTION NUMBER</label>
                      <input
                        type="number"
                        min="1"
                        value={customQNumber || String(nextQNum)}
                        onChange={(e) => setCustomQNumber(e.target.value)}
                        required
                      />
                    </div>

                    {questionMode === 'member' ? (
                      <div className="field" style={{ flex: 2 }}>
                        <label>ASSIGN TO TEAM MEMBER</label>
                        <select
                          value={customQTargetUser}
                          onChange={(e) => setCustomQTargetUser(e.target.value)}
                        >
                          <option value="">All members / open question</option>
                          {users.filter((u) => u.role === 'user').map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.username}{u.team_name ? ` · (${u.team_name})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="field" style={{ flex: 2 }}>
                        <label>ASSIGN TO TEAM</label>
                        <select
                          value={customQTargetTeam}
                          onChange={(e) => setCustomQTargetTeam(e.target.value)}
                        >
                          <option value="">All teams / open question</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {inputType === 'text' ? (
                    <div className="field">
                      <label>QUESTION / PROMPT TEXT</label>
                      <textarea
                        rows={3}
                        value={customQPrompt}
                        onChange={(e) => setCustomQPrompt(e.target.value)}
                        placeholder="Enter the question text, code puzzle, or problem statement..."
                        required
                      />
                    </div>
                  ) : inputType === 'audio' ? (
                    <>
                      <div className="field">
                        <label>UPLOAD AUDIO CLUE (.mp3, .wav, .ogg, .m4a)</label>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => setCustomQFiles(Array.from(e.target.files || []))}
                        />
                        {customQFiles.length > 0 && (
                          <small style={{ color: '#a78bfa', marginTop: 4, display: 'block' }}>
                            Selected audio: {customQFiles[0].name} ({(customQFiles[0].size / 1024).toFixed(1)} KB)
                          </small>
                        )}
                      </div>
                      <div className="field">
                        <label>OPTIONAL AUDIO PROMPT / TITLE</label>
                        <input
                          value={customQPrompt}
                          onChange={(e) => setCustomQPrompt(e.target.value)}
                          placeholder="e.g. Identify this tech startup sound or soundbite"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="field">
                        <label>UPLOAD CLUE IMAGE(S)</label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => setCustomQFiles(Array.from(e.target.files || []))}
                        />
                        {customQFiles.length > 0 && (
                          <small style={{ color: '#a78bfa', marginTop: 4, display: 'block' }}>
                            {customQFiles.length} file{customQFiles.length === 1 ? '' : 's'} selected
                          </small>
                        )}
                      </div>
                      <div className="field">
                        <label>OPTIONAL PROMPT / QUESTION TEXT</label>
                        <input
                          value={customQPrompt}
                          onChange={(e) => setCustomQPrompt(e.target.value)}
                          placeholder="e.g. Which algorithm or tech is illustrated below?"
                        />
                      </div>
                    </>
                  )}

                  <div className="form-row">
                    <div className="field" style={{ flex: 1 }}>
                      <label>CORRECT ANSWER</label>
                      <input
                        value={customQAnswer}
                        onChange={(e) => setCustomQAnswer(e.target.value)}
                        placeholder="Expected answer (admin reference)"
                      />
                    </div>
                    <div className="field" style={{ flex: 1 }}>
                      <label>HINT (OPTIONAL)</label>
                      <input
                        value={customQHint}
                        onChange={(e) => setCustomQHint(e.target.value)}
                        placeholder="Clue hint shown to players"
                      />
                    </div>
                  </div>

                  <button className="primary wide" type="submit" disabled={busy} style={{ marginTop: 10 }}>
                    <Plus size={16} /> Add Question
                  </button>
                </form>
              </div>

              {/* Right Column: Live Question Card matching Screenshot */}
              <div className="panel active-question-panel">
                <div className="panel-head">
                  <div>
                    <h3>Live question</h3>
                    <p>What participants see right now</p>
                  </div>
                  <span className={`status-tag ${activeQ ? 'on' : ''}`}>
                    <i /> {activeQ ? 'LIVE' : 'STANDBY'}
                  </span>
                </div>

                {activeQ ? (() => {
                  const qRoundKey = `${activity.key}:${activeQ.id}`;
                  const currentBuzzers = buzzers
                    .filter((b) => b.round_key === qRoundKey || b.round_key === `object:${activeQ.id}`)
                    .sort((a, b) => a.position - b.position);
                  const qEndsAtMs = activeQ.ends_at ? new Date(activeQ.ends_at).getTime() : null;
                  const qSecondsLeft = qEndsAtMs ? Math.max(0, Math.ceil((qEndsAtMs - clockNow) / 1000)) : 0;
                  const qDuration = activity.duration_seconds || 60;
                  const qPercent = qEndsAtMs ? Math.min(100, Math.max(0, (qSecondsLeft / qDuration) * 100)) : 0;

                  return (
                    <>
                      <div className="live-question-number" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          QUESTION <b>{activeQ.number}</b>
                        </div>
                        {activeQ.target_username && (
                          <span className="role-pill" style={{ background: '#1e293b', color: '#38bdf8' }}>
                            <Users size={12} /> Member: {activeQ.target_username}
                          </span>
                        )}
                        {activeQ.target_team_name && (
                          <span className="role-pill" style={{ background: '#1e293b', color: '#fbbf24' }}>
                            <Crown size={12} /> Team: {activeQ.target_team_name}
                          </span>
                        )}
                      </div>

                      {/* Display Question Content: Image, Audio, or Text */}
                      {inputType === 'audio' ? (
                        <div className="audio-clue-card" style={{ margin: '12px 0' }}>
                          {activeQ.prompt && <h4>{activeQ.prompt}</h4>}
                          {activeQ.images && activeQ.images.length > 0 ? (
                            <audio controls src={`${API}${activeQ.images[0]}`} style={{ width: '100%', marginTop: 8 }} />
                          ) : (
                            <div className="muted" style={{ padding: 12 }}>No audio track attached</div>
                          )}
                        </div>
                      ) : inputType === 'text' ? (
                        <div className="text-clue-card" style={{ margin: '12px 0' }}>
                          <h3>{activeQ.prompt || 'No question prompt entered.'}</h3>
                        </div>
                      ) : (
                        <div className="question-images" style={{ margin: '12px 0' }}>
                          {(activeQ.images || []).map((img) => (
                            <img key={img} src={`${API}${img}`} alt="Question clue" />
                          ))}
                          {!activeQ.images?.length && (
                            <div className="muted" style={{ padding: 14 }}>
                              {activeQ.prompt || 'No clue images uploaded'}
                            </div>
                          )}
                        </div>
                      )}

                      {activeQ.hint && (
                        <div className="callout" style={{ margin: '8px 0 12px 0' }}>
                          <Sparkles size={15} />
                          <div><b>Hint:</b> <p style={{ margin: 0 }}>{activeQ.hint}</p></div>
                        </div>
                      )}

                      {/* Timer Bar matching Screenshot */}
                      <div className="timer-display" style={{ display: 'grid', gap: 6, margin: '14px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Clock3 size={18} color={qSecondsLeft <= 5 && qSecondsLeft > 0 ? '#fb923c' : qSecondsLeft === 0 ? '#ef4444' : '#a78bfa'} />
                            <b style={{ fontSize: 18, color: qSecondsLeft === 0 ? '#ef4444' : '#f8fafc' }}>
                              {activeQ.ends_at ? (qSecondsLeft > 0 ? `${qSecondsLeft}s remaining` : 'TIME EXPIRED (0s)') : '—'}
                            </b>
                          </div>
                          <small style={{ color: '#8c95af' }}>
                            {qSecondsLeft > 0 ? `${qSecondsLeft}s left in round` : 'Round ended'}
                          </small>
                        </div>
                        {activeQ.ends_at && (
                          <div style={{ width: '100%', height: 5, background: '#22283e', borderRadius: 3, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${qPercent}%`,
                                height: '100%',
                                background: qSecondsLeft <= 5 ? '#ef4444' : 'linear-gradient(90deg, #a78bfa, #ec4899)',
                                transition: 'width 1s linear'
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Controls Row: Lock, Close, +30s Extend, Delete */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button
                          className="secondary"
                          style={{ flex: 1 }}
                          onClick={() => run(
                            () => api(`/api/questions/${activeQ.id}/lock`, { method: 'POST' }),
                            `Question ${activeQ.number} locked`
                          )}
                        >
                          <Lock size={14} /> Lock
                        </button>
                        <button
                          className="secondary"
                          style={{ flex: 1 }}
                          onClick={() => run(
                            () => api(`/api/questions/${activeQ.id}/close`, { method: 'POST' }),
                            `Question ${activeQ.number} closed`
                          )}
                        >
                          <Square size={14} /> Close
                        </button>
                        <button
                          className="secondary"
                          style={{ flex: 1 }}
                          onClick={() => handleExtendQuestion(activeQ.id, activeQ.number)}
                          title="Add 30 seconds to the timer"
                        >
                          <Plus size={14} /> +30s Extend
                        </button>
                        <button
                          className="secondary btn-delete"
                          style={{ flex: 1 }}
                          onClick={() => {
                            if (window.confirm(`Delete Question ${activeQ.number}? This will permanently remove its clues and submissions.`)) {
                              run(async () => {
                                await api(`/api/questions/${activeQ.id}`, { method: 'DELETE' });
                              }, `Question ${activeQ.number} deleted`);
                            }
                          }}
                          title="Delete question"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>

                      {/* Buzzers for Question matching Screenshot */}
                      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #282e44' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Radio size={16} color="#fb923c" />
                            <b style={{ fontSize: 12 }}>Buzzers for Question {activeQ.number}</b>
                            <span className="count-badge">{currentBuzzers.length}</span>
                          </div>
                          {currentBuzzers.length > 0 && (
                            <button
                              className="secondary small btn-delete"
                              onClick={() => {
                                if (window.confirm(`Clear buzzers for Question ${activeQ.number}? Count will reset to 0.`)) {
                                  run(
                                    () => api(`/api/buzzers/reset?round_key=${qRoundKey}`, { method: 'POST' }),
                                    `Buzzer log cleared for Question ${activeQ.number}`
                                  );
                                }
                              }}
                            >
                              <RotateCcw size={12} /> Reset Buzzers
                            </button>
                          )}
                        </div>

                        {currentBuzzers.length > 0 ? (
                          <div className="live-buzzers-queue">
                            <div className="queue-items">
                              {currentBuzzers.map((b) => (
                                <div key={b.id} className={`queue-chip ${b.position === 1 ? 'first-buzz' : ''}`}>
                                  <span className="pos">#{b.position}</span>
                                  <b>{b.team_name}</b>
                                  {b.username && <small>({b.username})</small>}
                                  {b.position === 1 && <span className="winner-tag">1ST BUZZ</span>}
                                  <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                                    <button
                                      type="button"
                                      className="pill-btn pos"
                                      onClick={() => handleSaveGenericMark(b.team_id, 10, activity.key, qRoundKey)}
                                      title="Award +10"
                                    >
                                      +10
                                    </button>
                                    <button
                                      type="button"
                                      className="pill-btn neg"
                                      onClick={() => handleSaveGenericMark(b.team_id, -5, activity.key, qRoundKey)}
                                      title="Deduct -5"
                                    >
                                      -5
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="muted" style={{ margin: 0 }}>
                            No team has pressed the buzzer yet for Question {activeQ.number}. (Buzzer count: 0)
                          </p>
                        )}
                      </div>

                      {/* Instant Scoring Card matching Screenshot */}
                      <div className="live-scoring-card" style={{ marginTop: 18 }}>
                        <div className="scoring-head">
                          <div>
                            <h4>Score Question {activeQ.number} (Leaderboard updates instantly)</h4>
                            <span className="subtle">Enter marks (+ or - e.g. +10, -5).</span>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gap: 8 }}>
                          {teams.map((team) => {
                            const scoreObj = scores.find(
                              (s) => s.team_id === team.id && s.round_key === qRoundKey
                            );
                            const currentMark = scoreObj ? scoreObj.points : null;
                            const draftKey = `${team.id}:${activeQ.id}`;
                            const draftVal = customMarksDraft[draftKey] ?? (currentMark !== null ? String(currentMark) : '10');

                            return (
                              <div key={team.id} className="score-badge-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                  <Crown size={14} color="#a78bfa" />
                                  <b style={{ fontSize: 12 }}>{team.name}</b>
                                  {currentMark !== null && (
                                    <span className={`points-pill ${currentMark >= 0 ? 'pos' : 'neg'}`}>
                                      {currentMark > 0 ? `+${currentMark}` : currentMark} pts
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <button
                                    type="button"
                                    className="pill-btn pos"
                                    onClick={() => handleSaveGenericMark(team.id, 10, activity.key, qRoundKey)}
                                    title="Give +10"
                                  >
                                    +10
                                  </button>
                                  <button
                                    type="button"
                                    className="pill-btn pos"
                                    onClick={() => handleSaveGenericMark(team.id, 5, activity.key, qRoundKey)}
                                    title="Give +5"
                                  >
                                    +5
                                  </button>
                                  <button
                                    type="button"
                                    className="pill-btn neg"
                                    onClick={() => handleSaveGenericMark(team.id, -5, activity.key, qRoundKey)}
                                    title="Deduct -5"
                                  >
                                    -5
                                  </button>
                                  <button
                                    type="button"
                                    className="pill-btn neg"
                                    onClick={() => handleSaveGenericMark(team.id, -10, activity.key, qRoundKey)}
                                    title="Deduct -10"
                                  >
                                    -10
                                  </button>
                                  <input
                                    type="number"
                                    value={draftVal}
                                    onChange={(e) =>
                                      setCustomMarksDraft((prev) => ({
                                        ...prev,
                                        [draftKey]: e.target.value
                                      }))
                                    }
                                    style={{
                                      width: 48,
                                      padding: '4px 6px',
                                      fontSize: 12,
                                      textAlign: 'center',
                                      borderRadius: 4,
                                      background: '#131622',
                                      border: '1px solid #2d354d',
                                      color: '#f8fafc'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="primary small"
                                    onClick={() => handleSaveGenericMark(team.id, Number(draftVal), activity.key, qRoundKey)}
                                    title="Save custom score"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {!teams.length && (
                            <div className="muted" style={{ padding: 8 }}>
                              No teams formed yet. Go to Teams page to create teams first.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })() : (
                  <div className="empty-live">
                    <div className="empty-icon"><ImageIcon size={25} /></div>
                    <b>No question is live</b>
                    <span>Unlock a prepared question below.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Prepared Questions Bank */}
            <div className="section-heading" style={{ marginTop: 24 }}>
              <div>
                <span className="section-kicker">QUESTION BANK</span>
                <h2>Prepared questions <span className="count-badge">{actQuestions.length}</span></h2>
              </div>
            </div>

            <div className="question-bank">
              {actQuestions.map((q) => (
                <div className="question-row" key={q.id} style={{ alignItems: 'flex-start' }}>
                  <div className="q-number">Q{String(q.number).padStart(2, '0')}</div>
                  <div className="q-main">
                    <b>Question {q.number}</b>
                    <small>
                      {q.prompt && `Prompt: ${q.prompt} · `}
                      {q.answer && `Answer: ${q.answer} · `}
                      {q.hint && `Hint: ${q.hint} · `}
                      {q.target_username && `Assigned: @${q.target_username} · `}
                      {q.target_team_name && `Target Team: ${q.target_team_name} · `}
                      {q.images?.length || 0} media item{q.images?.length === 1 ? '' : 's'}
                    </small>

                    {inputType === 'audio' && q.images && q.images.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        <audio controls src={`${API}${q.images[0]}`} style={{ height: 32 }} />
                      </div>
                    )}

                    {inputType === 'image' && q.images && q.images.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {q.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={`${API}${img}`}
                            alt="Clue"
                            style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #353b51' }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <span className={`status-tag ${q.status === 'active' ? 'on' : ''}`}>
                    <i /> {q.status}
                  </span>

                  <div className="q-actions" style={{ marginLeft: 'auto' }}>
                    {q.status !== 'active' && (
                      <button
                        className="primary small"
                        disabled={busy}
                        onClick={() => handleUnlockQuestion(q.id, q.number)}
                        title="Unlock question"
                      >
                        <Play size={13} /> Unlock
                      </button>
                    )}
                    {q.status === 'active' && (
                      <>
                        <button
                          className="secondary small"
                          onClick={() => run(
                            () => api(`/api/questions/${q.id}/lock`, { method: 'POST' }),
                            `Question ${q.number} locked`
                          )}
                          title="Lock question"
                        >
                          <Lock size={13} /> Lock
                        </button>
                        <button
                          className="secondary small"
                          onClick={() => run(
                            () => api(`/api/questions/${q.id}/close`, { method: 'POST' }),
                            `Question ${q.number} closed`
                          )}
                          title="Close question"
                        >
                          <Square size={13} /> Close
                        </button>
                      </>
                    )}
                    <button
                      className="secondary small btn-delete"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete Question ${q.number}? It will be removed even if completed.`)) {
                          run(async () => {
                            await api(`/api/questions/${q.id}`, { method: 'DELETE' });
                          }, `Question ${q.number} deleted`);
                        }
                      }}
                      title="Delete question"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              ))}
              {!actQuestions.length && <div className="panel empty-inline">No questions prepared yet for this activity.</div>}
            </div>
          </>
        ) : (
          /* Participant View */
          <div className="panel" style={{ marginBottom: 28 }}>
            <div className="panel-head">
              <div>
                <h3>Live Challenge · {activity.name}</h3>
                <p>
                  {questionMode === 'member'
                    ? 'Individual turns for squad members'
                    : 'Team challenge — work together to answer!'}
                </p>
              </div>
              <span className={`status-tag ${activeQ ? 'on' : ''}`}>
                <i /> {activeQ ? 'ACTIVE QUESTION' : 'WAITING FOR QUESTION'}
              </span>
            </div>

            {activeQ ? (() => {
              const qRoundKey = `${activity.key}:${activeQ.id}`;
              const currentBuzzers = buzzers
                .filter((b) => b.round_key === qRoundKey || b.round_key === `object:${activeQ.id}`)
                .sort((a, b) => a.position - b.position);
              const myBuzzer = currentBuzzers.find((b) => b.team_id === myTeam?.id);
              const qEndsAtMs = activeQ.ends_at ? new Date(activeQ.ends_at).getTime() : null;
              const qSecondsLeft = qEndsAtMs ? Math.max(0, Math.ceil((qEndsAtMs - clockNow) / 1000)) : 0;
              const qDuration = activity.duration_seconds || 60;
              const qPercent = qEndsAtMs ? Math.min(100, Math.max(0, (qSecondsLeft / qDuration) * 100)) : 0;
              const isMyTurn = !activeQ.target_user_id || activeQ.target_user_id === me?.id;
              const isMyTeamTurn = !activeQ.target_team_id || activeQ.target_team_id === myTeam?.id;

              return (
                <div>
                  <div className="live-question-number" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>QUESTION <b>{activeQ.number}</b></div>
                    {activeQ.target_username && (
                      <span className="role-pill" style={{ background: '#1e293b', color: activeQ.target_user_id === me?.id ? '#4ade80' : '#38bdf8' }}>
                        {activeQ.target_user_id === me?.id ? '⭐ YOUR TURN!' : `Speaker: ${activeQ.target_username}`}
                      </span>
                    )}
                  </div>

                  {inputType === 'audio' ? (
                    <div className="audio-clue-card" style={{ margin: '14px 0' }}>
                      {activeQ.prompt && <h4>{activeQ.prompt}</h4>}
                      {activeQ.images && activeQ.images.length > 0 ? (
                        <audio controls src={`${API}${activeQ.images[0]}`} style={{ width: '100%', marginTop: 8 }} />
                      ) : (
                        <div className="muted" style={{ padding: 12 }}>No audio clue provided</div>
                      )}
                    </div>
                  ) : inputType === 'text' ? (
                    <div className="text-clue-card" style={{ margin: '14px 0' }}>
                      <h3>{activeQ.prompt || 'Question in progress.'}</h3>
                    </div>
                  ) : (
                    <div className="question-images" style={{ margin: '14px 0' }}>
                      {(activeQ.images || []).map((img) => (
                        <img key={img} src={`${API}${img}`} alt="Question clue" />
                      ))}
                      {!activeQ.images?.length && <div className="muted" style={{ padding: 10 }}>No clue images yet.</div>}
                    </div>
                  )}

                  {activeQ.hint && (
                    <div className="callout" style={{ margin: '14px 0' }}>
                      <Sparkles size={16} />
                      <div><b>Hint:</b> <p>{activeQ.hint}</p></div>
                    </div>
                  )}

                  <div className="timer-display" style={{ display: 'grid', gap: 6, margin: '14px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock3 size={18} color={qSecondsLeft <= 5 && qSecondsLeft > 0 ? '#fb923c' : qSecondsLeft === 0 ? '#ef4444' : '#a78bfa'} />
                        <b style={{ fontSize: 18, color: qSecondsLeft === 0 ? '#ef4444' : '#f8fafc' }}>
                          {activeQ.ends_at ? (qSecondsLeft > 0 ? `${qSecondsLeft}s remaining` : 'TIME EXPIRED (0s)') : '—'}
                        </b>
                      </div>
                      <small style={{ color: '#8c95af' }}>
                        {qSecondsLeft > 0 ? `${qSecondsLeft}s left in round` : 'Round ended'}
                      </small>
                    </div>
                    {activeQ.ends_at && (
                      <div style={{ width: '100%', height: 5, background: '#22283e', borderRadius: 3, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${qPercent}%`,
                            height: '100%',
                            background: qSecondsLeft <= 5 ? '#ef4444' : 'linear-gradient(90deg, #a78bfa, #ec4899)',
                            transition: 'width 1s linear'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Buzzer Button if buzzer mode */}
                  {questionType === 'buzzer' && (
                    <div className="buzzer-action-box" style={{ margin: '16px 0' }}>
                      <button
                        type="button"
                        className={`buzzer-button big-buzzer ${myBuzzer ? 'buzzed' : ''}`}
                        disabled={busy || myBuzzer || !myTeam || !isMyTurn || !isMyTeamTurn}
                        onClick={() => handlePressBuzzer(qRoundKey, activity.key)}
                        style={{ minHeight: 74 }}
                      >
                        <Radio size={26} />
                        <span>
                          {myBuzzer
                            ? `BUZZED! POSITION #${myBuzzer.position}`
                            : !myTeam
                            ? 'JOIN A TEAM TO BUZZ'
                            : !isMyTurn
                            ? `ASSIGNED TO @${activeQ.target_username}`
                            : 'SLAM THE BUZZER!'}
                        </span>
                      </button>

                      {currentBuzzers.length > 0 && (
                        <div className="live-buzzers-queue" style={{ marginTop: 14 }}>
                          <div className="queue-title">BUZZER ORDER</div>
                          <div className="queue-items">
                            {currentBuzzers.map((b) => (
                              <div key={b.id} className={`queue-chip ${b.position === 1 ? 'first-buzz' : ''}`}>
                                <span className="pos">#{b.position}</span>
                                <b>{b.team_name}</b>
                                {b.username && <small>({b.username})</small>}
                                {b.position === 1 && <span className="winner-tag">1ST BUZZ</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Text Answer Submission form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!teamAnswer.trim()) return;
                      run(async () => {
                        await api('/api/submissions', {
                          method: 'POST',
                          body: JSON.stringify({
                            question_id: activeQ.id,
                            answer_text: teamAnswer.trim()
                          })
                        });
                        setTeamAnswer('');
                      }, 'Answer submitted to admin!');
                    }}
                    className="answer-form"
                    style={{ marginTop: 14 }}
                  >
                    <input
                      value={teamAnswer}
                      onChange={(e) => setTeamAnswer(e.target.value)}
                      placeholder="Type your answer here..."
                      disabled={busy || !isMyTurn || !isMyTeamTurn}
                    />
                    <button className="primary" disabled={busy || !teamAnswer.trim() || !isMyTurn || !isMyTeamTurn}>
                      Submit Answer
                    </button>
                  </form>
                </div>
              );
            })() : (
              <div className="empty-live">
                <div className="empty-icon"><ImageIcon size={25} /></div>
                <b>No question is live right now</b>
                <span>The administrator will unlock a question soon. Stand by!</span>
              </div>
            )}
          </div>
        )}

        {/* Live Leaderboard on this activity page */}
        <div className="leaderboard-panel" style={{ marginTop: 24 }}>
          <div className="leaderboard-head">
            <div>
              <h3>Event Leaderboard · Real-time standings</h3>
              <p>Scores update instantly when admin awards points</p>
            </div>
            <span className="live-tag"><i /> LIVE</span>
          </div>

          <div className="leaderboard-list">
            {(leaderboard?.rows || []).slice(0, 10).map((row, idx) => (
              <div key={row.team_id} className={`leaderboard-item ${idx === 0 ? 'rank-1' : ''}`}>
                <div className="rank-badge">#{idx + 1}</div>
                <div className="team-info">
                  <div className="team-name-row">
                    <Crown size={15} color={idx === 0 ? '#fbbf24' : '#a78bfa'} />
                    <b>{row.team_name}</b>
                  </div>
                  <div className="member-tags">
                    {row.members?.map((m) => (
                      <span key={m} className="member-tag">{m}</span>
                    ))}
                  </div>
                </div>
                <div className="team-score">
                  <b>{row.total_score}</b>
                  <span>PTS</span>
                </div>
              </div>
            ))}
            {!(leaderboard?.rows?.length) && (
              <div className="empty-inline">No teams on the leaderboard yet.</div>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderBuzzer = () => {
    const myTeam = teams.find((t) => t.members?.some((m) => m.id === me?.id));
    const roundKey = currentQ ? `object:${currentQ.id}` : 'general-round';
    const myBuzzer = buzzers.find(
      (b) => b.team_id === (myTeam ? myTeam.id : null) && (b.round_key === roundKey || buzzerFilter === 'all')
    );

    return (
      <>
        <div className="page-intro">
          <div>
            <div className="eyebrow">LIVE COMPETITION</div>
            <h1>Live buzzer<span>.</span></h1>
            <p>Real-time buzzer registration. Fast hands claim the floor!</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="secondary" onClick={() => loadBuzzers(buzzerFilter)}>
              <RefreshCw size={15} /> Refresh log
            </button>
            {isAdmin && (
              <button
                className="secondary btn-delete"
                onClick={() => {
                  if (window.confirm('Clear all buzzer entries?')) {
                    run(
                      () => api(`/api/buzzers/reset?round_key=${encodeURIComponent(buzzerFilter)}`, { method: 'POST' }),
                      'Buzzer log cleared'
                    );
                  }
                }}
              >
                <Trash2 size={15} /> Reset buzzers
              </button>
            )}
          </div>
        </div>

        {currentQ ? (
          <div className="buzzer-banner">
            <div className="buzzer-pulse"><Radio size={22} /></div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <b>QUESTION #{currentQ.number} IS LIVE</b>
                <span className="live-tag"><i /> ACTIVE ROUND</span>
              </div>
              <small>
                {currentQ.hint ? `Hint: ${currentQ.hint} · ` : ''}
                {currentQ.ends_at
                  ? `${Math.max(0, Math.ceil((new Date(currentQ.ends_at).getTime() - clockNow) / 1000))}s remaining`
                  : 'Timer active'}
              </small>
            </div>
          </div>
        ) : (
          <div className="buzzer-banner" style={{ borderColor: '#32374d', background: '#171c2b' }}>
            <div className="buzzer-pulse" style={{ background: '#22283a', color: '#9da5bd' }}><Radio size={22} /></div>
            <div>
              <b>General Buzzing Mode</b>
              <small>Teams can practice or buzz in for live questions.</small>
            </div>
          </div>
        )}

        <div className="panel" style={{ textAlign: 'center', padding: '36px 20px', marginBottom: 24 }}>
          <div style={{ maxWidth: 460, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 22, margin: '0 0 8px' }}>
              {myBuzzer ? '🎉 Buzzer Recorded!' : 'Ready to Buzz In?'}
            </h2>
            <p className="muted" style={{ margin: '0 0 24px' }}>
              {myBuzzer
                ? `Your team locked in position #${myBuzzer.position} at ${new Date(myBuzzer.pressed_at).toLocaleTimeString()}`
                : !myTeam && !isAdmin
                ? 'Join or create a team on the Teams tab before pressing the buzzer.'
                : 'Slam the red buzzer as soon as you know the answer!'}
            </p>

            <button
              type="button"
              className={`buzzer-button big-buzzer ${myBuzzer ? 'buzzed' : ''}`}
              disabled={busy || myBuzzer || (!myTeam && !isAdmin)}
              onClick={() => handlePressBuzzer(roundKey, 'find-object')}
              style={{
                width: '100%',
                minHeight: 88,
                fontSize: 19,
                cursor: myBuzzer ? 'default' : 'pointer'
              }}
            >
              <Radio size={32} />
              <span>
                {myBuzzer
                  ? `BUZZED! POSITION #${myBuzzer.position}`
                  : !myTeam && !isAdmin
                  ? 'JOIN A TEAM TO BUZZ'
                  : 'SLAM THE BUZZER!'}
              </span>
            </button>

            {myBuzzer && (
              <div style={{ marginTop: 14, color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Check size={18} />
                <span>
                  {myBuzzer.is_winner ? '1ST PLACE — YOUR TEAM WON THE BUZZER!' : `Recorded at Position #${myBuzzer.position}`}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Buzzer activity & rankings</h3>
              <p>Incoming presses recorded in real time</p>
            </div>
            <span className="count-badge">{buzzers.length}</span>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>RANK</th>
                  <th>TEAM</th>
                  <th>PARTICIPANT</th>
                  <th>ROUND</th>
                  <th>TIME</th>
                  <th>RESULT</th>
                </tr>
              </thead>
              <tbody>
                {buzzers.map((buzzer, idx) => (
                  <tr key={buzzer.id || idx}>
                    <td>
                      <span className={`rank-number ${buzzer.position === 1 ? 'rank-1' : buzzer.position === 2 ? 'rank-2' : buzzer.position === 3 ? 'rank-3' : ''}`}>
                        #{buzzer.position || idx + 1}
                      </span>
                    </td>
                    <td><b>{buzzer.team_name || '—'}</b></td>
                    <td>{buzzer.username || '—'}</td>
                    <td>{buzzer.round_name || buzzer.activity_key || '—'}</td>
                    <td>{buzzer.pressed_at ? new Date(buzzer.pressed_at).toLocaleTimeString() : '—'}</td>
                    <td>
                      <span className={`status-tag ${buzzer.is_winner ? 'on' : ''}`}>
                        <i /> {buzzer.is_winner ? 'FIRST BUZZ' : 'RECORDED'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!buzzers.length && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: 24, color: '#8892b0' }}>
                      No buzzer presses recorded for this round yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderLeaderboard = () => {
    const validRows = (leaderboard.rows || []).filter(
      (r) => r.team_name !== 'Admin Staff' && r.name !== 'Admin Staff'
    );

    return (
      <>
        <div className="page-intro">
          <div>
            <div className="eyebrow">CURRENT STANDINGS</div>
            <h1>Leaderboard<span>.</span></h1>
            <p>Live rankings and score breakdown by question. Positive and negative marks are calculated in real time.</p>
          </div>
          <button className="secondary" onClick={refresh}>
            <RefreshCw size={15} /> Refresh scores
          </button>
        </div>

        {isAdmin && (
          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="panel-head">
              <div>
                <h3>Direct Question Scoring</h3>
                <p>Award or deduct points (+ or -) for any team on any question</p>
              </div>
              <Sparkles size={18} color="#a78bfa" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const teamId = Number(e.target.team_select.value);
                const qNum = e.target.q_select.value;
                const pts = Number(e.target.points_input.value);
                if (!teamId || !qNum || isNaN(pts)) return;
                const targetQ = questions.find((q) => String(q.number) === qNum);
                const qId = targetQ ? targetQ.id : qNum;
                handleSaveMark(teamId, pts, qId);
              }}
              style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}
            >
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: 10, marginBottom: 5, color: '#94a3b8' }}>TEAM</label>
                <select name="team_select" required style={{ width: '100%' }}>
                  <option value="">Select team…</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: 10, marginBottom: 5, color: '#94a3b8' }}>QUESTION</label>
                <select name="q_select" required style={{ width: '100%' }}>
                  <option value="">Select question…</option>
                  {questions.map((q) => (
                    <option key={q.id} value={String(q.number)}>Question {q.number}</option>
                  ))}
                </select>
              </div>

              <div style={{ width: 110 }}>
                <label style={{ display: 'block', fontSize: 10, marginBottom: 5, color: '#94a3b8' }}>MARK (+ or -)</label>
                <input
                  name="points_input"
                  type="number"
                  defaultValue="10"
                  required
                  style={{ width: '100%', textAlign: 'center', fontWeight: 'bold' }}
                />
              </div>

              <button className="primary" type="submit" disabled={busy}>
                <Check size={15} /> Save Mark to Leaderboard
              </button>
            </form>
          </div>
        )}

        <div className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 70 }}>RANK</th>
                  <th>TEAM</th>
                  <th>QUESTION SCORES BREAKDOWN</th>
                  <th style={{ textAlign: 'right', width: 110 }}>TOTAL SCORE</th>
                </tr>
              </thead>
              <tbody>
                {validRows.map((row, index) => {
                  const teamScores = row.scores || scores.filter((s) => s.team_id === row.team_id);

                  return (
                    <tr key={row.team_id || row.team_name || index}>
                      <td><span className={`rank-badge ${index === 0 ? 'rank-1' : ''}`}>{row.rank || index + 1}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Crown size={15} color="#a78bfa" />
                          <b>{row.team_name || row.name}</b>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {teamScores && teamScores.length > 0 ? (
                            teamScores.map((s, idx) => {
                              const qMatch = s.round_key?.startsWith('object:') ? s.round_key.replace('object:', 'Q') : s.round_key;
                              return (
                                <span
                                  key={idx}
                                  className={`points-pill ${s.points >= 0 ? 'pos' : 'neg'}`}
                                  title={`${s.round_key}: ${s.points} pts`}
                                >
                                  {qMatch}: {s.points >= 0 ? `+${s.points}` : s.points}
                                </span>
                              );
                            })
                          ) : (
                            <span className="muted" style={{ fontSize: 10 }}>No questions scored yet</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <b style={{ fontSize: 16, color: (row.points ?? 0) >= 0 ? '#4ade80' : '#f87171' }}>
                          {(row.points ?? 0) >= 0 ? `+${row.points ?? 0}` : row.points}
                        </b>
                      </td>
                    </tr>
                  );
                })}
                {!validRows.length && <tr><td colSpan="4">No teams ranked yet. Create teams on the Teams page.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderSettings = () => (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">EVENT CONFIGURATION</div>
          <h1>Settings<span>.</span></h1>
          <p>Manage activities, configure timers, and control your event.</p>
        </div>
      </div>

      {/* Create New Activity */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-head">
          <div><h3>Create new activity</h3><p>Add a custom activity with configurable input type and question mode.</p></div>
          <div className="step-badge"><Plus size={12} /> NEW</div>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          if (!newActivityName.trim()) return;
          run(async () => {
            await api('/api/activities', {
              method: 'POST',
              body: JSON.stringify({
                name: newActivityName.trim(),
                duration_seconds: Number(newActivityDuration) || 60,
                input_type: newActivityInputType,
                question_mode: newActivityQuestionMode,
                question_type: newActivityQuestionType
              })
            });
            setNewActivityName('');
            setNewActivityDuration(60);
            setNewActivityInputType('image');
            setNewActivityQuestionMode('team');
            setNewActivityQuestionType('buzzer');
          }, `Activity "${newActivityName.trim()}" created!`);
        }}>
          <div className="form-row">
            <div className="field" style={{ flex: 2, minWidth: 180 }}>
              <label>ACTIVITY NAME</label>
              <input
                value={newActivityName}
                onChange={(e) => setNewActivityName(e.target.value)}
                placeholder="e.g. Code Challenge"
                required
              />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 100 }}>
              <label>DURATION (SEC)</label>
              <input
                type="number"
                min="10"
                max="3600"
                value={newActivityDuration}
                onChange={(e) => setNewActivityDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 12 }}>
            <div className="field" style={{ flex: 1, minWidth: 140 }}>
              <label>INPUT TYPE</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['image', 'audio', 'text'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={newActivityInputType === type ? 'primary small' : 'secondary small'}
                    onClick={() => setNewActivityInputType(type)}
                    style={{ flex: 1, textTransform: 'capitalize' }}
                  >
                    {type === 'image' && <ImageIcon size={13} />}
                    {type === 'audio' && <Volume2 size={13} />}
                    {type === 'text' && <MessageSquareText size={13} />}
                    {' '}{type}
                  </button>
                ))}
              </div>
              <small style={{ color: '#8892b0', marginTop: 4, display: 'block' }}>
                {newActivityInputType === 'image' && 'Visual puzzles, screenshots, clue photos'}
                {newActivityInputType === 'audio' && 'Sound bites, theme tracks, spoken clues'}
                {newActivityInputType === 'text' && 'Code snippet, riddle, or text question'}
              </small>
            </div>

            <div className="field" style={{ flex: 1, minWidth: 140 }}>
              <label>QUESTION MODE</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={newActivityQuestionMode === 'team' ? 'primary small' : 'secondary small'}
                  onClick={() => setNewActivityQuestionMode('team')}
                  style={{ flex: 1 }}
                >
                  <Crown size={13} /> Per Team
                </button>
                <button
                  type="button"
                  className={newActivityQuestionMode === 'member' ? 'primary small' : 'secondary small'}
                  onClick={() => setNewActivityQuestionMode('member')}
                  style={{ flex: 1 }}
                >
                  <Users size={13} /> Per Member
                </button>
              </div>
              <small style={{ color: '#8892b0', marginTop: 4, display: 'block' }}>
                {newActivityQuestionMode === 'team'
                  ? 'One common question for the whole team to answer'
                  : 'Every squad member receives an individual question'}
              </small>
            </div>

            <div className="field" style={{ flex: 1, minWidth: 140 }}>
              <label>QUESTION TYPE</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { id: 'buzzer', label: 'Buzzer Race' },
                  { id: 'trivia', label: 'Direct Trivia' },
                  { id: 'clue', label: 'Clue Puzzle' }
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    className={newActivityQuestionType === id ? 'primary small' : 'secondary small'}
                    onClick={() => setNewActivityQuestionType(id)}
                    style={{ flex: 1 }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <small style={{ color: '#8892b0', marginTop: 4, display: 'block' }}>
                {newActivityQuestionType === 'buzzer' && 'Fastest buzzer press gets first turn to answer'}
                {newActivityQuestionType === 'trivia' && 'Direct question & answer evaluation'}
                {newActivityQuestionType === 'clue' && 'Multi-part clue solving round'}
              </small>
            </div>
          </div>

          <button className="primary wide" type="submit" disabled={busy || !newActivityName.trim()} style={{ marginTop: 14 }}>
            <Plus size={16} /> Create activity
          </button>
        </form>
      </div>

      {/* Activity list with rename, delete, and timer */}
      <div className="panel">
        <div className="panel-head">
          <div><h3>All activities</h3><p>Manage timers, rename, or delete activities.</p></div>
          <Settings2 size={19} />
        </div>
        {activities.map((activity) => (
          <div className="setting-row" key={activity.key} style={{ flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              {editingActivityKey === activity.key ? (
                <form
                  className="rename-line"
                  style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!editingActivityName.trim()) return;
                    run(async () => {
                      await api(`/api/activities/${activity.key}/rename`, {
                        method: 'PATCH',
                        body: JSON.stringify({ name: editingActivityName.trim() })
                      });
                      setEditingActivityKey(null);
                    }, `Activity renamed to "${editingActivityName.trim()}"`);
                  }}
                >
                  <input
                    value={editingActivityName}
                    onChange={(e) => setEditingActivityName(e.target.value)}
                    autoFocus
                    placeholder="Activity name"
                    required
                    style={{ width: 180 }}
                  />
                  <button className="primary small" type="submit" disabled={busy}>Save</button>
                  <button className="secondary small" type="button" onClick={() => setEditingActivityKey(null)}>Cancel</button>
                </form>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <b>{activity.name}</b>
                  <button
                    className="icon-btn"
                    type="button"
                    title="Rename activity"
                    onClick={() => {
                      setEditingActivityKey(activity.key);
                      setEditingActivityName(activity.name);
                    }}
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <small style={{ color: '#8892b0' }}>{activity.key}</small>
                {activity.input_type && (
                  <span className="role-pill" style={{ fontSize: 9, padding: '2px 6px', background: '#1e2a3e', color: '#94a3b8', border: '1px solid #2d3a52' }}>
                    {activity.input_type}
                  </span>
                )}
                {activity.question_mode && (
                  <span className="role-pill" style={{ fontSize: 9, padding: '2px 6px', background: '#1e2a3e', color: '#94a3b8', border: '1px solid #2d3a52' }}>
                    {activity.question_mode === 'team' ? 'per team' : 'per member'}
                  </span>
                )}
                {activity.question_type && (
                  <span className="role-pill" style={{ fontSize: 9, padding: '2px 6px', background: '#2e1065', color: '#c084fc', border: '1px solid #581c87' }}>
                    {activity.question_type}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {timerControl(activity)}
              <button
                className="secondary small"
                onClick={() => setPage(activity.key)}
                title={`Open ${activity.name}`}
              >
                <ArrowRight size={13} /> Open
              </button>
              {activity.key !== 'find-object' && activity.key !== 'lightning-speech' && (
                <button
                  className="secondary small btn-delete"
                  onClick={() => {
                    if (window.confirm(`Delete activity "${activity.name}"? All related scores and data will be removed.`)) {
                      run(
                        () => api(`/api/activities/${activity.key}`, { method: 'DELETE' }),
                        `Activity "${activity.name}" deleted`
                      );
                    }
                  }}
                  disabled={busy}
                  title="Delete this activity"
                >
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {!activities.length && <div className="empty-inline">No activities configured.</div>}
      </div>
    </>
  );

  const renderUser = () => {
    const myTopic = topics.find((topic) => topic.user_id === me?.id);
    const myTeam = teams.find((t) => t.members?.some((m) => m.id === me?.id));

    return (
      <>
        <div className="welcome-row">
          <div>
            <div className="eyebrow">WELCOME TO THE ARENA <Sparkles size={13} /></div>
            <h1>Ready to play, <span>{me?.username}?</span></h1>
            <p>Keep an eye on the live round and your team's progress.</p>
          </div>
        </div>

        {myTeam ? (
          <div className="user-team-banner">
            <div className="team-banner-mark"><Crown size={24} /></div>
            <div>
              <small>YOUR SQUAD</small>
              <h2>{myTeam.name}</h2>
              <p>{myTeam.members?.map((m) => m.username).join(', ')}</p>
            </div>
            <div className="team-banner-badge">
              <button
                className="secondary small"
                onClick={() => {
                  setEditingTeamId(myTeam.id);
                  setEditingTeamName(myTeam.name);
                  setPage('Teams');
                }}
              >
                <Pencil size={13} /> Rename team
              </button>
            </div>
          </div>
        ) : (
          <div className="callout" style={{ marginBottom: 25 }}>
            <Users size={18} />
            <div>
              <b>Not assigned to a team yet</b>
              <p>Wait for the administrator to shuffle teams, or check the Teams page.</p>
            </div>
          </div>
        )}

        <div className="stats-grid">
          <Stat icon={Users} label="Participants" value={users.length} sub="Players in the arena" />
          <Stat icon={Flag} label="Teams" value={teams.length} sub="Teams formed" accent="blue" />
          <Stat icon={Activity} label="Questions" value={questions.length} sub="Prepared challenges" accent="orange" />
          <Stat icon={Trophy} label="Leaderboard" value={leaderboard.rows?.length || 0} sub="Teams ranked" accent="green" />
        </div>

        <div className="bottom-grid">
          <div className="panel">
            <div className="panel-head">
              <div><h3>Your speaking topic</h3><p>Only you can see your assigned topic.</p></div>
              <Lock size={18} />
            </div>
            {myTopic?.status === 'active' ? (
              <>
                <div className="secret-card">
                  <span>YOUR TOPIC</span>
                  <h2>{myTopic.text}</h2>
                </div>
                <p className="muted">Your turn is active. Speak before the timer expires.</p>
                <button className="primary" onClick={() => setPage('Lightning Speech')}>
                  Open Lightning Speech <ArrowRight size={15} />
                </button>
              </>
            ) : (
              <div className="empty-live">
                <MessageSquareText size={25} />
                <b>{myTopic ? 'Your turn is not active yet' : 'No topic assigned yet'}</b>
                <span>Wait for the administrator to start your turn.</span>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-head">
              <div><h3>Quick links</h3><p>Navigate to the live games.</p></div>
              <Bolt size={18} />
            </div>
            <button className="quick-action" onClick={() => setPage('Teams')}>
              <Crown size={18} /><span>View & Rename Team</span><ChevronRight size={15} />
            </button>
            <button className="quick-action" onClick={() => setPage('Find the Object')}>
              <ImageIcon size={18} /><span>Find the Object</span><ChevronRight size={15} />
            </button>
            <button className="quick-action" onClick={() => setPage('Lightning Speech')}>
              <MessageSquareText size={18} /><span>Lightning Speech</span><ChevronRight size={15} />
            </button>
            <button className="quick-action" onClick={() => setPage('Leaderboard')}>
              <Trophy size={18} /><span>Leaderboard</span><ChevronRight size={15} />
            </button>
          </div>
        </div>
      </>
    );
  };

  const content = useMemo(() => {
    if (!me) return null;

    if (!isAdmin) {
      if (page === 'Teams') return renderTeams();
      if (page === 'Lightning Speech' || page === 'lightning-speech' || page === speechAct?.name) return renderSpeech();
      if (page === 'Find the Object' || page === 'find-object' || page === findObjectAct?.name) return renderFindObject();
      if (page === 'Live buzzer') return renderBuzzer();
      if (page === 'Leaderboard') return renderLeaderboard();
      const matchedAct = activities.find((a) => a.key === page || a.name === page);
      if (matchedAct) {
        if (matchedAct.key === 'find-object') return renderFindObject();
        if (matchedAct.key === 'lightning-speech') return renderSpeech();
        return renderCustomActivity(matchedAct);
      }
      return renderUser();
    }

    if (page === 'Overview') return renderOverview();
    if (page === 'Participants') return renderParticipants();
    if (page === 'Teams') return renderTeams();
    if (page === 'Find the Object' || page === 'find-object' || page === findObjectAct?.name) return renderFindObject();
    if (page === 'Lightning Speech' || page === 'lightning-speech' || page === speechAct?.name) return renderSpeech();
    if (page === 'Live buzzer') return renderBuzzer();
    if (page === 'Settings') return renderSettings();
    if (page === 'Leaderboard') return renderLeaderboard();

    const matchedCustom = activities.find((a) => a.key === page || a.name === page);
    if (matchedCustom) {
      if (matchedCustom.key === 'find-object') return renderFindObject();
      if (matchedCustom.key === 'lightning-speech') return renderSpeech();
      return renderCustomActivity(matchedCustom);
    }

    return renderOverview();
  }, [
    me, isAdmin, page, users, teams, questions, activities, leaderboard,
    topics, currentQ, submissions, buzzers, qFiles, qAnswer, qHint,
    qNumber, topicText, topicUser, teamName, teamMembers, durationDraft,
    scoreDraft, busy, clockNow, buzzerFilter, teamSize, editingTeamId,
    editingTeamName, isDragging, speechMarksDraft,
    newActivityName, newActivityDuration, newActivityInputType, newActivityQuestionMode,
    newActivityQuestionType, editingActivityKey, editingActivityName, scores,
    customQNumber, customQPrompt, customQAnswer, customQHint,
    customQTargetUser, customQTargetTeam, customQFiles, customMarksDraft,
    findObjectAct?.name, speechAct?.name
  ]);

  if (!token || !me) {
    return (
      <div className="login-shell">
        <div className="login-left">
          <div className="brand">
            <div className="brand-icon"><Zap size={22} /></div>
            <span>FUN FRIDAY <span className="brand-light">/ ARENA</span></span>
          </div>

          <div className="login-hero">
            <div className="eyebrow"><Sparkles size={14} /> THE TEAM TECH SHOWDOWN</div>
            <h1>Bring your <span>tech game.</span></h1>
            <p>Two challenges. One leaderboard.<br />A Friday your team will talk about.</p>
            <div className="login-stats">
              <div><strong>02</strong><small>LIVE GAMES</small></div>
              <div><strong>∞</strong><small>TEAM ENERGY</small></div>
              <div><strong>01</strong><small>CHAMPION</small></div>
            </div>
          </div>

          <div className="login-footer">
            <span>BUILT FOR CURIOUS MINDS</span>
            <span>v1.0 · LOCAL ARENA</span>
          </div>
          <div className="orb orb1" />
          <div className="orb orb2" />
        </div>

        <div className="login-right">
          <div className="login-card">
            <div className="mobile-brand">
              <div className="brand-icon"><Zap size={22} /></div>
              FUN FRIDAY ARENA
            </div>
            <div className="login-kicker">YOUR NEXT ROUND STARTS HERE</div>
            <h2>{authMode === 'login' ? 'Welcome back' : 'Join the arena'}<span>.</span></h2>
            <p className="muted">
              {authMode === 'login'
                ? 'Sign in to enter the arena.'
                : 'Create a participant account to get started.'}
            </p>

            {authMessage && <div className="auth-success">{authMessage}</div>}

            {authMode === 'login' ? (
              <form onSubmit={login}>
                <label>USERNAME</label>
                <div className="input-wrap">
                  <Users size={17} />
                  <input
                    value={loginName}
                    onChange={(event) => setLoginName(event.target.value)}
                    autoComplete="username"
                    placeholder="Enter your username"
                    required
                  />
                </div>

                <label>PASSWORD</label>
                <div className="input-wrap">
                  <Lock size={17} />
                  <input
                    value={loginPass}
                    onChange={(event) => setLoginPass(event.target.value)}
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                  />
                  <button type="button" className="eye" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {error && <div className="error-box">{error}</div>}
                <button className="primary wide" disabled={busy}>
                  {busy ? 'Entering…' : <>Enter the arena <ArrowRight size={17} /></>}
                </button>
              </form>
            ) : (
              <form onSubmit={signup}>
                <label>USERNAME</label>
                <div className="input-wrap">
                  <Users size={17} />
                  <input
                    value={signupName}
                    onChange={(event) => setSignupName(event.target.value)}
                    autoComplete="username"
                    placeholder="Choose a username"
                    minLength={2}
                    maxLength={80}
                    pattern="[A-Za-z0-9_.-]+"
                    title="Use letters, numbers, dot, underscore or hyphen"
                    required
                  />
                </div>

                <label>PASSWORD (MINIMUM 8 CHARACTERS)</label>
                <div className="input-wrap">
                  <Lock size={17} />
                  <input
                    value={signupPass}
                    onChange={(event) => setSignupPass(event.target.value)}
                    type={showPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create a password"
                    minLength={8}
                    maxLength={128}
                    required
                  />
                  <button type="button" className="eye" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {error && <div className="error-box">{error}</div>}
                <button className="primary wide" disabled={busy}>
                  {busy ? 'Creating account…' : <>Create participant account <ArrowRight size={17} /></>}
                </button>
              </form>
            )}

            <button
              className="auth-switch"
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setError('');
                setAuthMessage('');
              }}
            >
              {authMode === 'login'
                ? 'New here? Create an account'
                : 'Already registered? Sign in'}
            </button>
            <div className="login-bottom">Secure access <span>•</span> Admin & participant roles</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand side-brand">
          <div className="brand-icon"><Zap size={21} /></div>
          <span>FUN FRIDAY <span className="brand-light">ARENA</span></span>
        </div>

        <div className="event-badge">
          <div className="event-symbol"><Sparkles size={16} /></div>
          <div><b>TECH SHOWDOWN</b><small>LOCAL EVENT · 2026</small></div>
          <span className="event-live-dot" />
        </div>

        <div className="nav-label">{isAdmin ? 'EVENT CONTROL' : 'PLAYER MENU'}</div>
        <nav>
          {(isAdmin ? navAdmin : navUser).map(([label, Icon]) => (
            <button
              key={label}
              className={page === label ? 'nav-item active' : 'nav-item'}
              onClick={() => setPage(label)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === 'Live buzzer' && <i className="nav-live" />}
              {page === label && <ChevronRight size={15} className="nav-chevron" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon"><Bolt size={16} /></div>
            <b>{isAdmin ? 'Pro tip' : 'Play smart'}</b>
            <p>
              {isAdmin
                ? 'Unlock one round at a time to keep the competition fair.'
                : 'First valid press wins your team’s buzzer position.'}
            </p>
          </div>

          <div className="sidebar-profile">
            <div className="avatar">{me.username[0].toUpperCase()}</div>
            <div><b>{me.username}</b><small>{isAdmin ? 'Administrator' : 'Participant'}</small></div>
            <button className="icon-btn" onClick={logout}><LogOut size={16} /></button>
          </div>

          <div className="version">FUN FRIDAY ARENA <span>v1.0.0</span></div>
        </div>
      </aside>

      <main className="main-area">
        <Header />
        <div className="content-area">
          {error && (
            <div className="global-error">
              <span>{error}</span>
              <button onClick={() => setError('')}><X size={15} /></button>
            </div>
          )}
          {content}
          <footer className="page-footer">
            <span>© FUN FRIDAY ARENA</span>
            <span>MADE FOR TEAMWORK <Sparkles size={12} /></span>
          </footer>
        </div>
      </main>

      {isAdmin && speechExpiredModal && (
        <div className="modal-overlay" onClick={() => setSpeechExpiredModal(null)}>
          <div className="modal-content alert-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="alert-icon-wrap">
                <AlarmClock size={24} />
              </div>
              <div>
                <h3>Time's Up! — Lightning Speech</h3>
                <span className="eyebrow" style={{ color: '#fb923c', margin: 0 }}>
                  TURN TIMER EXPIRED
                </span>
              </div>
            </div>

            <div className="modal-body">
              <p>The allotted speaking time has ended for the active speaker:</p>

              <div className="speaker-card-highlight">
                <span style={{ fontSize: 11, color: '#a79be3' }}>SPEAKER</span>
                <b>{speechExpiredModal.username}</b>
                <span style={{ fontSize: 11, color: '#a79be3', marginTop: 6 }}>ASSIGNED TOPIC</span>
                <span>“{speechExpiredModal.text}”</span>
              </div>

              <p style={{ margin: 0, fontSize: 12, color: '#9aa2ba' }}>
                Please conclude the participant's turn or proceed to assign the next speaker.
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="primary wide"
                onClick={() => {
                  run(
                    () => api(`/api/lightning/topics/${speechExpiredModal.id}/close`, { method: 'POST' }),
                    `Speaker turn ended for ${speechExpiredModal.username}`
                  );
                  setSpeechExpiredModal(null);
                }}
              >
                <Check size={16} /> End speaker turn & Close
              </button>
              <button
                className="secondary"
                onClick={() => setSpeechExpiredModal(null)}
              >
                Dismiss alert
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast"><Check size={17} />{toast}</div>}
      {busy && <div className="busy-indicator"><span /></div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
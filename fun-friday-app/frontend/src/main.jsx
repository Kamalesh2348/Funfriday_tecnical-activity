import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlarmClock, ArrowRight, Award, Bell, Bolt, Check,
  ChevronRight, CircleHelp, Clock3, CloudUpload, Crown, DoorOpen,
  Eye, EyeOff, FileSpreadsheet, Flag, Image as ImageIcon,
  LayoutDashboard, Lock, LogOut, Menu, MessageSquareText, Monitor,
  Play, Plus, Radio, RefreshCw, Settings2, ShieldCheck, Sparkles,
  Timer, Trophy, Users, Volume2, WandSparkles, X, Zap
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

  const isAdmin = me?.role === 'admin';

  const navAdmin = [
    ['Overview', LayoutDashboard],
    ['Participants', Users],
    ['Teams', Crown],
    ['Find the Object', ImageIcon],
    ['Lightning Speech', MessageSquareText],
    ['Live buzzer', Radio],
    ['Settings', Settings2]
  ];

  const navUser = [
    ['Overview', LayoutDashboard],
    ['Live buzzer', Radio],
    ['Lightning Speech', MessageSquareText],
    ['Leaderboard', Trophy]
  ];

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
        api('/api/lightning/topics')
      ];

      const results = await Promise.allSettled(requests);

      if (results[0].status === 'fulfilled') setUsers(results[0].value);
      if (results[1].status === 'fulfilled') setTeams(results[1].value);
      if (results[2].status === 'fulfilled') setQuestions(results[2].value);
      if (results[3].status === 'fulfilled') setActivities(results[3].value);
      if (results[4].status === 'fulfilled') setLeaderboard(results[4].value);
      if (results[5].status === 'fulfilled') setTopics(results[5].value);

      if (profile.role === 'admin') {
        const extra = await Promise.allSettled([
          api('/api/submissions'),
          api('/api/buzzers')
        ]);

        if (extra[0].status === 'fulfilled') setSubmissions(extra[0].value);
        if (extra[1].status === 'fulfilled') setBuzzers(extra[1].value);
      } else {
        setSubmissions([]);
        setBuzzers([]);
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
      setClockNow(Date.now());
      refresh();
    }, 3000);

    return () => clearInterval(interval);
  }, [token, refresh]);

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

  const renderTeams = () => (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">TEAM MANAGEMENT</div>
          <h1>Teams<span>.</span></h1>
          <p>Create teams and assign registered participants.</p>
        </div>
      </div>

      {isAdmin && (
        <div className="panel">
          <div className="panel-head">
            <div><h3>Create a team</h3><p>Choose a name and add participants.</p></div>
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
              <input value={teamName} onChange={(event) => setTeamName(event.target.value)} required />
            </div>
            <div className="field">
              <label>PARTICIPANTS</label>
              <select
                multiple
                value={teamMembers}
                onChange={(event) => setTeamMembers(
                  Array.from(event.target.selectedOptions, (option) => option.value)
                )}
              >
                {users.filter((user) => user.role === 'user').map((user) => (
                  <option value={String(user.id)} key={user.id}>{user.username}</option>
                ))}
              </select>
            </div>
            <button className="primary" type="submit" disabled={busy}>
              <Plus size={16} /> Create team
            </button>
          </form>
        </div>
      )}

      <div className="team-grid">
        {teams.map((team) => (
          <div className="panel team-card" key={team.id}>
            <div className="team-card-icon"><Crown size={22} /></div>
            <h3>{team.name}</h3>
            <p>{team.members?.length || 0} members</p>
            <div className="team-members">
              {(team.members || []).map((member) => (
                <span key={member.id} className="member-pill">
                  {member.username}
                </span>
              ))}
            </div>
          </div>
        ))}
        {!teams.length && <div className="panel empty-inline">No teams created yet.</div>}
      </div>
    </>
  );

  const renderSpeech = () => {
    const activeTopic = topics.find((topic) => topic.status === 'active');
    const myTopic = topics.find((topic) => topic.user_id === me?.id);
    const secondsLeft = activeTopic?.ends_at
      ? Math.max(0, Math.ceil((new Date(activeTopic.ends_at).getTime() - clockNow) / 1000))
      : 0;

    return (
      <>
        <div className="page-intro">
          <div>
            <div className="eyebrow">GAME 02 · TOPIC & TIMER</div>
            <h1>Lightning Speech<span>.</span></h1>
            <p>Each speaker gets a private topic and a timed turn.</p>
          </div>
          <div className="inline-stat orange">
            <Clock3 size={17} /><span>Each turn</span>
            <b>{act('lightning-speech')?.duration_seconds || 120}s</b>
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

              <div className="panel speech-live">
                <div className="panel-head">
                  <div><h3>Speaking round</h3><p>One participant at a time</p></div>
                  <span className={`status-tag ${activeTopic ? 'on' : ''}`}>
                    <i /> {activeTopic ? 'LIVE' : 'STANDBY'}
                  </span>
                </div>

                {activeTopic ? (
                  <>
                    <div className="secret-card">
                      <span>THE SPEAKER'S TOPIC</span>
                      <h2>{activeTopic.text || 'Private topic'}</h2>
                      <small>{activeTopic.username} is speaking</small>
                    </div>
                    <div className="speech-countdown admin-countdown">
                      <span className="live-dot" />
                      <strong>{formatCountdown(secondsLeft)}</strong>
                      <small>TIME REMAINING</small>
                    </div>
                    <p className="muted">No audio is recorded. The turn closes automatically when time expires.</p>
                    <button
                      className="secondary wide"
                      onClick={() => run(
                        () => api(`/api/lightning/topics/${activeTopic.id}/close`, { method: 'POST' }),
                        'Speaking turn ended'
                      )}
                    >
                      End turn now
                    </button>
                  </>
                ) : (
                  <div className="empty-live">
                    <div className="empty-icon orange"><Clock3 size={25} /></div>
                    <b>Ready for the next speaker?</b>
                    <span>Assign a topic and start their turn.</span>
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
              {topics.map((topic) => (
                <div className="topic-row" key={topic.id}>
                  <div className="topic-symbol"><MessageSquareText size={18} /></div>
                  <div className="topic-player">
                    <b>{topic.username}</b>
                    <small>
                      {teams.find((team) => team.members?.some((member) => member.id === topic.user_id))?.name
                        || 'No team assigned'}
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
                  </div>
                </div>
              ))}
            </div>

            <div className="callout orange-callout">
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

  const renderFindObject = () => (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">GAME 01 · VISUAL PUZZLE</div>
          <h1>Find the Object<span>.</span></h1>
          <p>Manage clue images, publish questions, and review team submissions.</p>
        </div>
      </div>

      {isAdmin && (
        <div className="split-layout">
          <div className="panel">
            <div className="panel-head">
              <div><h3>Create a question</h3><p>Add between 2 and 5 images for each clue.</p></div>
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
              }, 'Question created');
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

              <label className="upload-zone">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  onChange={(event) => setQFiles(Array.from(event.target.files || []).slice(0, 5))}
                />
                <div className="upload-icon"><CloudUpload size={24} /></div>
                <b>Drop your clue images here</b>
                <span>PNG, JPG, WEBP or GIF · 2–5 images</span>
                <small>{qFiles.length ? `${qFiles.length} image(s) selected` : 'Click to browse files'}</small>
                {qFiles.length > 0 && (
                  <div className="file-pills">
                    {qFiles.map((file) => <span key={file.name}>{file.name}</span>)}
                  </div>
                )}
              </label>

              <button className="primary" type="submit" disabled={busy || qFiles.length < 2 || qFiles.length > 5}>
                <Plus size={16} /> Save question
              </button>
            </form>
          </div>

          <div className="panel active-question-panel">
            <div className="panel-head">
              <div><h3>Live question</h3><p>What participants see right now</p></div>
              <span className={`status-tag ${currentQ ? 'on' : ''}`}><i />{currentQ ? 'LIVE' : 'WAITING'}</span>
            </div>

            {currentQ ? (
              <>
                <div className="live-question-number">QUESTION <b>{currentQ.number}</b></div>
                <div className="question-images">
                  {(currentQ.images || []).map((image) => (
                    <img key={image} src={`${API}${image}`} alt="Question clue" />
                  ))}
                </div>
                <div className="timer-display">
                  <Clock3 size={18} />
                  <div>
                    <b>{currentQ.ends_at ? `${Math.max(0, Math.ceil((new Date(currentQ.ends_at).getTime() - clockNow) / 1000))}s` : '—'}</b>
                    <small>remaining (approx.)</small>
                  </div>
                </div>
                <button
                  className="secondary wide"
                  onClick={() => run(
                    () => api(`/api/questions/${currentQ.id}/close`, { method: 'POST' }),
                    'Question closed'
                  )}
                >
                  Close question
                </button>
              </>
            ) : (
              <div className="empty-live">
                <div className="empty-icon"><ImageIcon size={25} /></div>
                <b>No question is live</b>
                <span>Unlock a prepared question below.</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="section-heading">
        <div>
          <span className="section-kicker">QUESTION BANK</span>
          <h2>Prepared questions <span className="count-badge">{questions.length}</span></h2>
        </div>
      </div>

      <div className="question-bank">
        {questions.map((question) => (
          <div className="question-row" key={question.id}>
            <div className="q-number">Q{String(question.number).padStart(2, '0')}</div>
            <div className="q-main">
              <b>Question {question.number}</b>
              <small>
                {question.images?.length || 0} image clues
                {isAdmin ? ` · Answer: ${question.answer || 'Hidden from participants'}` : ''}
              </small>
            </div>
            <span className={`status-tag ${question.status === 'active' ? 'on' : ''}`}>
              <i /> {question.status}
            </span>
            {isAdmin && (
              <div className="q-actions">
                {question.status !== 'active' && (
                  <button
                    className="primary small"
                    disabled={!act('find-object')?.unlocked || busy}
                    onClick={() => run(
                      () => api(`/api/questions/${question.id}/unlock`, { method: 'POST' }),
                      `Question ${question.number} unlocked`
                    )}
                  >
                    <Play size={13} /> Unlock
                  </button>
                )}
                {question.status === 'active' && (
                  <button
                    className="secondary small"
                    onClick={() => run(
                      () => api(`/api/questions/${question.id}/close`, { method: 'POST' }),
                      'Question closed'
                    )}
                  >
                    Close
                  </button>
                )}
                <button className="secondary small" onClick={() => loadBuzzers(`object:${question.id}`)}>
                  Buzzer log
                </button>
              </div>
            )}
          </div>
        ))}
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
                      min="0"
                      value={scoreDraft[submission.id] ?? 10}
                      onChange={(event) => setScoreDraft({ ...scoreDraft, [submission.id]: event.target.value })}
                      title="Points"
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
                        'Correct answer confirmed'
                      )}
                    >
                      Correct
                    </button>
                    <button
                      className="secondary small"
                      disabled={submission.status !== 'pending'}
                      onClick={() => run(
                        () => api(`/api/submissions/${submission.id}/evaluate`, {
                          method: 'POST',
                          body: JSON.stringify({ status: 'incorrect', points: 0 })
                        }),
                        'Marked incorrect'
                      )}
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

  const renderBuzzer = () => (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">LIVE COMPETITION</div>
          <h1>Live buzzer<span>.</span></h1>
          <p>Review the first valid buzzer press for each round.</p>
        </div>
        <button className="secondary" onClick={() => loadBuzzers('all')}>
          <RefreshCw size={15} /> Refresh log
        </button>
      </div>

      {isAdmin ? (
        <div className="panel">
          <div className="panel-head">
            <div><h3>Buzzer activity</h3><p>Incoming presses and winning teams</p></div>
            <span className="count-badge">{buzzers.length}</span>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>TEAM</th><th>PARTICIPANT</th><th>ROUND</th><th>TIME</th><th>RESULT</th></tr>
              </thead>
              <tbody>
                {buzzers.map((buzzer) => (
                  <tr key={buzzer.id}>
                    <td>{buzzer.team_name || '—'}</td>
                    <td>{buzzer.username || '—'}</td>
                    <td>{buzzer.round_name || buzzer.activity_key || '—'}</td>
                    <td>{buzzer.pressed_at ? new Date(buzzer.pressed_at).toLocaleTimeString() : '—'}</td>
                    <td>
                      <span className={`status-tag ${buzzer.is_winner ? 'on' : ''}`}>
                        <i /> {buzzer.is_winner ? 'FIRST PRESS' : 'RECORDED'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!buzzers.length && <tr><td colSpan="5">No buzzer presses recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-head">
            <div><h3>Ready to buzz?</h3><p>Your team can press the buzzer during an active round.</p></div>
          </div>
          <div className="empty-live">
            <Radio size={28} />
            <b>Wait for the administrator to unlock a round.</b>
            <span>The buzzer will become available when a question is live.</span>
          </div>
        </div>
      )}
    </>
  );

  const renderLeaderboard = () => (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">CURRENT STANDINGS</div>
          <h1>Leaderboard<span>.</span></h1>
          <p>See which teams are leading the competition.</p>
        </div>
      </div>

      <div className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>RANK</th><th>TEAM</th><th>POINTS</th></tr>
            </thead>
            <tbody>
              {(leaderboard.rows || []).map((row, index) => (
                <tr key={row.team_id || row.team_name || index}>
                  <td><span className="rank-badge">{row.rank || index + 1}</span></td>
                  <td><b>{row.team_name || row.name}</b></td>
                  <td><b>{row.points ?? row.score ?? 0}</b></td>
                </tr>
              ))}
              {!leaderboard.rows?.length && <tr><td colSpan="3">No leaderboard data yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderSettings = () => (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">EVENT CONFIGURATION</div>
          <h1>Settings<span>.</span></h1>
          <p>Review the event status and activity timers.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div><h3>Activity timers</h3><p>Update the duration for each activity.</p></div>
          <Settings2 size={19} />
        </div>
        {activities.map((activity) => (
          <div className="setting-row" key={activity.key}>
            <div>
              <b>{activity.name}</b>
              <small>{activity.key}</small>
            </div>
            {timerControl(activity)}
          </div>
        ))}
        {!activities.length && <div className="empty-inline">No activities configured.</div>}
      </div>
    </>
  );

  const renderUser = () => {
    const myTopic = topics.find((topic) => topic.user_id === me?.id);

    return (
      <>
        <div className="welcome-row">
          <div>
            <div className="eyebrow">WELCOME TO THE ARENA <Sparkles size={13} /></div>
            <h1>Ready to play, <span>{me?.username}?</span></h1>
            <p>Keep an eye on the live round and your team's progress.</p>
          </div>
        </div>

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
      if (page === 'Lightning Speech') return renderSpeech();
      if (page === 'Find the Object') return renderFindObject();
      if (page === 'Live buzzer') return renderBuzzer();
      if (page === 'Leaderboard') return renderLeaderboard();
      return renderUser();
    }

    switch (page) {
      case 'Overview': return renderOverview();
      case 'Participants': return renderParticipants();
      case 'Teams': return renderTeams();
      case 'Find the Object': return renderFindObject();
      case 'Lightning Speech': return renderSpeech();
      case 'Live buzzer': return renderBuzzer();
      case 'Settings': return renderSettings();
      case 'Leaderboard': return renderLeaderboard();
      default: return renderOverview();
    }
  }, [
    me, isAdmin, page, users, teams, questions, activities, leaderboard,
    topics, currentQ, submissions, buzzers, qFiles, qAnswer, qHint,
    qNumber, topicText, topicUser, teamName, teamMembers, durationDraft,
    scoreDraft, busy, clockNow, buzzerFilter
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

      {toast && <div className="toast"><Check size={17} />{toast}</div>}
      {busy && <div className="busy-indicator"><span /></div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
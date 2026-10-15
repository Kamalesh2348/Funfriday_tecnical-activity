# Fun Friday Arena

A locally runnable starter application for your Fun Friday technical activities. It includes an attractive React dashboard and a FastAPI backend with SQLite by default (easy to run locally), authentication/roles, team generation, activity settings, questions/images, answer submissions, buzzer rankings, manual scores, Excel result import, and publication controls.

> This is a starter MVP for local testing, not a hardened production deployment. Use a private network only until you configure strong secrets, HTTPS, production-grade session handling, and backups.

## Requirements
- Python 3.11+
- Node.js 20+

## 1. Start the backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env     # then edit ADMIN_PASSWORD before the first run
uvicorn app.main:app --reload --port 8000 --env-file .env
```
API docs: http://localhost:8000/docs

On first startup (empty database) the `admin` account is created with `ADMIN_PASSWORD` from `.env` (default `Admin123!` if unset). If `SEED_DEMO_USERS` is not `false`, demo accounts are also created:
- Admin: `admin` / `Admin123!`
- User: `alice` / `User123!`
- User: `bob` / `User123!`
- User: `charlie` / `User123!`
- User: `dina` / `User123!`

Add real participants from the admin **Participants** page. Passwords only apply on first creation; to reset, delete `backend/funfriday.db`. The backend stores password hashes.

## 2. Start the frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```
Open http://localhost:5173. Change `VITE_API_URL` in `frontend/.env` if you change the backend port. Create the file from `.env.example` if needed.

## Included features
- Role-based login and separate admin/user views.
- Online presence using periodic heartbeats (best-effort browser presence).
- Generate teams from selected online/offline participants; odd counts produce one team of three.
- Rename teams.
- One shared duration setting per activity, used for future rounds.
- Create Find the Object questions with 2–5 images and upload image files.
- Unlock/close questions and speaking turns.
- Submit answers; admin marks correct/incorrect and manually awards points.
- Buzzer entries recorded server-side; one entry per team per round. The button stays available for other eligible teams until the round closes/ends.
- User view shows the first three teams in buzzer ranking; admin view shows all entries.
- Assign a private Lightning Speech word to each participant; only that user and admin can retrieve it.
- Admin can add participants (username + password) from the Participants page.
- Import an Excel leaderboard/results file (its values are ADDED to live/manual scores for matching team names) (`Team`, `Find the Object`, `Lightning Speech`, `Total` columns) with `openpyxl`.
- Publish each activity's results and the overall leaderboard.

## Excel template
Use these column names in the first row:
`Team`, `Find the Object`, `Lightning Speech`, `Total`

## Notes / limitations
- SQLite is used by default so the project runs without a separate database install. You can move to PostgreSQL later.
- The UI polls for changes to keep this starter straightforward. The backend has a WebSocket endpoint at `/ws`; it can be wired into the frontend for push updates in a later iteration. For an event with many concurrent users, use WebSockets end-to-end and test under load.
- Buzzer ranking is serialized by a database transaction and a unique constraint on `(round_key, team_id)` to prevent duplicate team entries.
- A confirmed correct answer closes the round for further answer submissions/buzzes. Admin can still review prior buzzer entries.
- Timer deadlines are server-side. Requests after the deadline are rejected even if a browser countdown appears slightly behind.
- Team regeneration after rounds have started can affect fairness; use it only before starting the activities.

## Signup and Lightning Speech updates

- The login screen has a **Create an account** option. Signup creates participant-only accounts; usernames must be unique and passwords must be at least 8 characters. Passwords are stored as hashes. Signup cannot create admin accounts.
- The demo-account credentials have been removed from the login screen. The initial admin account is still created by the backend startup configuration; set `ADMIN_PASSWORD` before the database is first initialized.
- For Lightning Speech, the admin assigns a topic to a participant and clicks **Start turn**. That action reveals the topic to that participant and starts the configured countdown. Only the admin and assigned participant receive the topic text. The timer closes the turn automatically at zero, then waits for the admin to start another participant.
- The app does not record or store audio. Lightning Speech is a topic and timer workflow only.

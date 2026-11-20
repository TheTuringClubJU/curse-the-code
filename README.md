# Curse the Code

The Turing Club's team escape-room game. React and Three.js render the rooms;
FastAPI verifies actions and stores team progress in PostgreSQL.

- [Project and collaboration guide](docs/PROJECT_GUIDE.md): start here if you are new to the project.
- [Room 2 backend handoff](docs/ROOM2_HANDOFF.md): API contract, rules, tests and frontend integration work.
- [Team assignments and task list](TODO.md)
- [Existing deployment configuration](DEPLOYMENT.md)

## Local development

Use Python 3.12 and Node 22, matching CI. From this directory:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Set `DATABASE_URL` in your ignored `.env` to a dedicated local development
database. Have the database owner apply `schema.sql` to that development
database. Keep `CONTENT_FILE=content.test.json`. Never use the event database
for development or tests.

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open `http://localhost:5173`. Vite forwards `/api` requests to the local API.
`http://127.0.0.1:8000/docs` shows the API explorer. Currently the participant
app mounts Room 1; the Room 2 frontend is a separate assigned task.

**Existing startup behavior:** importing the authentication service seeds demo
teams and resets their sessions. This needs review before event deployment;
see the project guide. Do not start this development build against event data.

## Tests

Apply `schema.sql` to a dedicated local PostgreSQL database named `ctc_test`
before running tests. The test harness rejects remote database hosts and names
that do not start with `ctc_test`, before importing the demo seed code.

```powershell
$env:DATABASE_URL='postgresql://test:test@127.0.0.1:5432/ctc_test'
$env:CONTENT_FILE='content.test.json'
$env:COOKIE_SECURE='false'
.\.venv\Scripts\python.exe -m pytest tests/study --cov=app.game.study_service --cov-report=term-missing
.\.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing
npm.cmd test --prefix frontend
npm.cmd run build --prefix frontend
```

Replace the example credentials/port with your local test server settings.
CI already supplies a disposable PostgreSQL 16 service and applies the schema.
Neither the test commands nor the frontend build publishes the website.

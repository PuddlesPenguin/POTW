# Purdue Math Club POTW

A React + Express + PostgreSQL app for publishing weekly problems, accepting text/file solutions, tracking submissions, and displaying a leaderboard.

For a page-by-page explanation of the visual and interaction changes, see [DESIGN_CHANGES.md](DESIGN_CHANGES.md).

## Backend setup

### 1. Create the database

Install PostgreSQL, then create a database named `potw`:

```sql
CREATE DATABASE potw;
```

From this project directory, apply the schema and (optionally) the sample problems:

```powershell
psql -U postgres -d potw -f db/001_schema.sql
psql -U postgres -d potw -f db/002_sample_problems.sql
psql -U postgres -d potw -f db/003_admin_features.sql
psql -U postgres -d potw -f db/004_submission_options.sql
psql -U postgres -d potw -f db/005_account_security.sql
psql -U postgres -d potw -f db/006_problem_release_times.sql
psql -U postgres -d potw -f db/007_problem_due_times.sql
psql -U postgres -d potw -f db/008_default_due_time.sql
psql -U postgres -d potw -f db/009_align_seed_season.sql
psql -U postgres -d potw -f db/010_hint_responses.sql
```

The schema script is compatible with the partial `users`, `problems`, and `submissions` tables used by the original project. Back up a database that already contains important data before running any migration.

### 2. Configure environment variables

Create a local `.env` file in the project root and add the following values. This file is intentionally not included in the public repository:

```env
DATABASE_URL=postgresql://postgres:your-password@localhost:5432/potw
JWT_SECRET=use-a-long-random-value-here
PORT=3000
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
EMAIL_FROM=Purdue Math Club POTW <potw@example.com>
```

Generate a suitable JWT secret in PowerShell with:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Do not commit `.env` or any other environment file. They are ignored by Git.

Use the SMTP settings supplied by your email provider. Without SMTP, development mode prints a verification/reset link in the server console so the flows can be tested locally. Production mode requires SMTP and will not expose those links.

### 3. Install and run

```powershell
npm install
npm run dev:all
```

Or run the two processes separately:

```powershell
npm run dev:server
npm run dev
```

The frontend runs at `http://localhost:5173`; the API runs at `http://localhost:3000`. Check the database connection at `http://localhost:3000/api/health`.

## Admin workspace

Admins see an **Admin** link after logging in. The workspace has simple tabs for:

- Grading pending submissions from 0–5 points with written feedback
- Adding, previewing, scheduling, editing, archiving, and removing problems
- Reviewing solver problem proposals and hint requests
- Creating date-based leaderboard seasons
- Granting admin access (superuser only)

New problems default to the next Monday at 6:00 PM Eastern and the following Sunday at 6:00 PM Eastern. Admins can choose exact times. These timestamps control public visibility and submission availability; the release date is still used to place the problem in a leaderboard season.

New accounts must verify their email before login. Signup, login, verification, and password-reset endpoints are rate limited. Users can hide themselves from the public leaderboard with Anonymous mode while retaining their private submission and score history.

Problem difficulty is rated from 1–10. Leaderboard scoring is separate: every problem is worth up to 5 points, and a solver's best graded attempt on each problem counts for the season containing that problem's release date.

## Managing problems and grading with SQL

Problem records can be managed in pgAdmin or with SQL. When replacing the current problems, archive the old records and set the new records current:

```sql
UPDATE problems
SET is_current = false, is_archived = true
WHERE is_current = true;

INSERT INTO problems
  (title, statement_latex, solution_latex, problem_source, proposed_by,
   problem_type, is_current, release_date, due_date, hints, difficulty_rating)
VALUES
  ('Problem title', 'LaTeX statement', 'Private solution', 'Source', 'Name',
   'Computational', true, CURRENT_DATE, CURRENT_DATE + 7, 'A helpful hint', 3);
```

Grade submissions in pgAdmin (the solution and grading fields are never returned by public problem endpoints):

```sql
UPDATE submissions
SET is_correct = true, score = 5, feedback = 'Nice work!', graded_at = CURRENT_TIMESTAMP
WHERE id = 1;
```

To promote a registered account to an admin for future admin-only features:

```sql
UPDATE users SET is_admin = true WHERE email = 'officer@purdue.edu';
```

## API routes

- `POST /api/auth/register` and `POST /api/auth/login`
- `GET /api/problems/current` and `GET /api/problems/archive`
- `POST /api/submissions` (Bearer token, multipart form)
- `GET /api/submissions/mine` (Bearer token)
- `GET /api/submissions/:id/file` (Bearer token, owner only)
- `GET /api/seasons` and `GET /api/leaderboard?season_id=1`
- `POST /api/problem-proposals` and `POST /api/problems/:id/hint-requests`
- `/api/admin/*` routes for grading, problems, proposals, seasons, and user roles

Uploads are stored in PostgreSQL and limited to 5 MB. For a high-volume deployment, replace `bytea` storage with S3 or another object store.

## Production

Build the frontend with `npm run build`. Serve the `dist` directory from your hosting platform and run the API with `npm run start:server`. Set `VITE_API_URL` at build time if the API is hosted on a different origin, for example `VITE_API_URL=https://api.example.com`.

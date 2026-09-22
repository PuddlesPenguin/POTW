# Purdue Math Club POTW

Web application for publishing Purdue Math Club problems of the week, accepting solutions, grading submissions, and maintaining seasonal leaderboards.

## Documentation

- [Codebase Guide](docs/POTW_Codebase_Guide.pdf) - architecture, data model, API, frontend, security, and maintenance
- [Deployment Guide](docs/POTW_Render_Deployment_Guide.pdf) - Render, PostgreSQL, Resend, and Namecheap setup

The LaTeX sources for both manuals are in [`docs/`](docs/).

## Stack

- React 19, TypeScript, Vite, and Tailwind CSS
- Express 5 and PostgreSQL
- JWT authentication, email verification, and password recovery

## Local development

Requirements: Node.js, npm, and PostgreSQL.

1. Create a PostgreSQL database named `potw`.
2. Apply the SQL files in [`db/`](db/) in numeric order.
3. Create `.env` in the repository root:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/potw
JWT_SECRET=replace-with-a-long-random-secret
PORT=3000
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM=Purdue Math Club POTW <potw@example.com>
```

4. Install dependencies and start the frontend and API:

```powershell
npm install
npm run dev:all
```

The frontend runs at `http://localhost:5173`, the API at `http://localhost:3000`, and the health check at `http://localhost:3000/api/health`.

Do not commit `.env`. In development, email links are printed to the server console when SMTP is not configured; production requires SMTP.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite frontend |
| `npm run dev:server` | Start the API with file watching |
| `npm run dev:all` | Start frontend and API together |
| `npm run build` | Type-check and build the frontend |
| `npm run lint` | Run ESLint |
| `npm run start:server` | Start the API without file watching |

## Production

Run `npm run build` for the frontend and `npm run start:server` for the API. Set `VITE_API_URL` at build time when the API is hosted on a different origin.

Uploads are stored in PostgreSQL and limited to 5 MB. See the deployment guide for service configuration, migrations, DNS, email, and release checks.

# Campus Lost & Found backend

Backend for the existing React 18 + Vite frontend. The frontend and its `/api` proxy remain unchanged (`localhost:5000`). Runtime uses Node.js ES modules, Express, mysql2/promise, bcryptjs, jsonwebtoken, Helmet, CORS, and dotenv. Tests use Node's built-in test runner.

## Database setup (MySQL 8)

From `backend/`, configure a MySQL account that can create the database and tables. The scripts use the database name `campus_lost_found`.

In Command Prompt, import the schema, then trigger, then seed data (supply the MySQL password at each prompt):

```bat
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < database\schema.sql
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p campus_lost_found < database\triggers.sql
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p campus_lost_found < database\seed.sql
```

The schema uses `CREATE DATABASE/TABLE IF NOT EXISTS`; the seed upserts catalog names. It does not drop or reset data. The trigger script replaces only its named trigger. The schema includes safe read views and an indexed generated column that enforces one approved claim per item while allowing unlimited pending claims.

## Backend setup

1. Copy `.env.example` to `.env` and set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=campus_lost_found`, a random `JWT_SECRET` of at least 32 characters, and optionally `FRONTEND_ORIGIN`.
2. Install dependencies with `npm install`.
3. Provision the first administrator from an interactive terminal using `npm run create-admin`. The command asks for a name/email and reads the password without echo, hashes it with bcryptjs, and inserts the ADMIN. If that email already exists, it requires explicit `PROMOTE` confirmation before updating its role/password. Never use public registration to create an admin.
4. Start the API with `npm run dev` (or `npm start`). Check `http://localhost:5000/api/health`.

Keep `.env` out of source control. No student or administrator credentials are included in SQL seed data.

## API and security notes

API responses use `{ success: true, data: ... }` or `{ success: false, message: ... }`. Every application endpoint except login, registration, and health requires a bearer JWT. The server reloads the account role from MySQL on private requests, so demotion takes effect immediately. Every admin route also requires `ADMIN` authorization. Password hashes and private claim descriptions are omitted from public item and student activity responses.

Item search uses parameterized `LIKE` substring matching. Claim approval locks the item and claim in a Node-owned transaction, approves one claim, rejects other pending claims with an explanation, and moves the item to `CLAIM_PENDING`; the generated unique index is the final guard against a second approval. Return is a separate transaction to `RETURNED`. The history trigger records status transitions and reads `@app_actor_user_id`; transactional connections set it and clear it before reuse, destroying a connection if cleanup fails.

## Tests

- `npm test` runs the no-database health and error-envelope tests. The MySQL integration test is skipped by default.
- Import the schema, trigger, and seed files first. Configure `.env` for a dedicated local test database, then run `npm run test:db`. This exercises registration (including ignored role spoofing), login, auth/admin guards, filters, self-claim prevention, duplicate pending claims, competing approvals, return, history, and private-field visibility. It creates uniquely named test accounts/items and removes those records afterward; it leaves categories and locations intact.

Database tests require MySQL 8 and a DB account with select/insert/update/delete rights. A failed test run should be inspected before using the test database further.

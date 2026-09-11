# Client Project Dashboard

Full-stack internal tool for an agency to manage client projects, assign
tasks, and watch team activity live. React/TypeScript frontend, Node/Express
backend, PostgreSQL via Prisma, real-time layer over Socket.io.

## Local setup (Docker, preferred)

```bash
git clone <this-repo>
cd project-dashboard
docker compose up --build
```

This starts Postgres, runs the backend (migrations apply automatically on
container start via `prisma migrate deploy`), and serves the frontend.

- API: http://localhost:4000
- Frontend: http://localhost:5173

Seed the database once the containers are up:

```bash
docker compose exec backend npm run seed
```

All seeded users share the password `Password123!`. Emails: `admin@agency.dev`,
`rohan.pm@agency.dev`, `laura.pm@agency.dev`, `dev1@agency.dev`...`dev4@agency.dev`.

## Local setup (without Docker)

Requires Postgres running locally and Node 20+.

```bash
# backend
cd backend
cp .env.example .env   # edit DATABASE_URL if needed
npm install
npx prisma migrate dev
npm run seed
npm run dev

# frontend, in a second terminal
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Database schema

See `backend/prisma/schema.prisma` for the full model. Summary:

- **User** (role: ADMIN / PM / DEVELOPER) → creates Projects, gets assigned
  Tasks, generates ActivityLog entries, receives Notifications.
- **Client** → **Project** (1:many) → **Task** (1:many).
- **Task** has a persisted **TaskStatusLog** (one row per status change, with
  who and when) and can generate **Notification** rows for its assignee or
  the owning PM.
- **ActivityLog** is its own table, not derived from TaskStatusLog, because
  activity entries also cover project/task creation, not just status moves.

Indexes were placed on every column that either a filter (`status`,
`priority`, `dueDate`) or a permission check (`assigneeId`, `createdById`,
`projectId`) runs a `WHERE` against, plus a composite
`(projectId, createdAt)` on ActivityLog since the feed query is always
"recent events for a set of projects."

## Architectural decisions

**Socket.io over raw WebSocket.** The spec allows either. Raw WebSocket
would mean hand-rolling room-based broadcasting (needed for per-project and
per-role scoping) and reconnection/backoff handling. Socket.io gives both for
free, at the cost of a slightly heavier client. For an internal agency tool
where correctness matters more than shaving frames off the payload, that
trade is worth it.

**Refresh token in an HttpOnly cookie, access token in memory.** The access
token lives in React state (`AuthContext`), never localStorage, so an XSS
payload reading `localStorage` gets nothing long-lived. The refresh token is
HttpOnly and scoped to `/api/auth`, so JS can't read it even in a successful
XSS. Access tokens are short-lived (15 min); the axios interceptor in
`api/client.ts` retries once against `/auth/refresh` on a 401 before giving
up.

**Role enforcement as query scoping, not response filtering.** Every list or
detail endpoint builds its Prisma `where` clause from the caller's role
(`services/scope.service.ts`) before hitting the database, rather than
fetching everything and filtering the array in the controller. This is what
actually satisfies "a Developer must not reach a PM's data even by hitting
the endpoint with a modified token" — there's no code path where the full
dataset is ever assembled for a Developer's request in the first place.

**node-cron over Bull for the overdue sweep.** Bull (or BullMQ) earns its
Redis dependency when you have per-item retry, backoff, and priority
semantics. The overdue job is a single periodic `UPDATE ... WHERE dueDate <
now()` sweep with no per-task failure handling to speak of. Adding a queue
here would be infrastructure for a problem this doesn't have.

**Activity write-then-emit ordering.** `activity.service.ts` writes the
`ActivityLog` row first, then emits over the socket. If a client reconnects
and calls the catchup endpoint between those two steps, it's a race that
could theoretically miss or duplicate one event — mitigated by de-duping on
event `id` client-side in `useLiveActivity`, which is why the emit payload
reuses the same `id` the database row was created with.

## Known limitations

- **Socket room membership is assigned at connect time.** If a Developer is
  assigned to a task on a project they weren't already in a room for, the
  backend explicitly re-joins their live sockets (`joinUserToProjectRoom`),
  but this only covers the assignment path — a PM being handed an existing
  project mid-session isn't currently re-joined the same way. A production
  version would re-derive room membership on every relevant write instead of
  patching specific cases.
- **No pagination on task lists or the activity feed.** Fine at seed-data
  scale; would need cursor-based pagination for a real agency's task volume.
- **Single server instance assumed.** Socket.io's room broadcasting is
  in-process; scaling to multiple backend instances would need the Redis
  adapter for Socket.io so rooms are shared across processes.
- **No test suite.** Given the time budget, effort went into the RBAC and
  real-time correctness instead. The scoping logic in `scope.service.ts` is
  the highest-value thing to unit test first.

## Explanation (for the submission's Explanation field)

The hardest problem was the real-time, role-filtered activity feed with
missed-event catchup. The tricky part isn't broadcasting an event, it's
making sure a client that was offline, reconnects, and then receives live
events doesn't end up with duplicates or gaps against what it fetches from
the database. I solved it by treating Postgres as the single source of
truth: every activity event is written to the `ActivityLog` table before it
is ever emitted over the socket, and the emit payload carries the same row
ID as the database record. The client keeps a `Set` of seen IDs; on
reconnect it fetches the last 20 events from the DB and merges them against
whatever arrived live in the meantime, de-duping by ID. Role filtering
happens at the transport layer, not in application code: sockets join rooms
based on scope at connect time (a PM's socket only joins rooms for projects
`createdById` matches them), so a broadcast to a project room is
structurally incapable of reaching someone outside that scope. One thing
I'd do differently: re-derive a user's room membership on every relevant
write (new assignment, project transfer) instead of the current approach of
explicitly patching the one case I anticipated (task assignment), which
leaves a gap for less common membership changes.

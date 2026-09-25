# Maison CRM

Monorepo with a single git repository at the root.

```
maison-crm-core/
├── frontend/    TanStack Start + React 19 + Tailwind (the existing CRM UI)
├── backend/     NestJS + PostgreSQL (Prisma) + MongoDB (Mongoose) + Socket.IO
└── .lovable/    Lovable project config
```

## Requirements

Node **>= 20.19** (or >= 22.12) — the Nest CLI `require()`s ES modules, which
older versions cannot do. `.nvmrc` pins 22.21.1, so **run `nvm use` first**.

On an older Node the frontend starts normally and only the backend dies, with a
`ERR_REQUIRE_ESM` stack trace from inside `@angular-devkit/schematics` that says
nothing about Node versions. The backend's `start:dev` now checks the version up
front and tells you to run `nvm use` instead.

## Quick start

There is no package.json at the repository root — `backend/` and `frontend/` are
independent npm projects, each run from its own folder.

```bash
nvm use                        # 22.21.1, from .nvmrc — do this first

npm install --prefix backend
npm install --prefix frontend

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

npm run db:up      --prefix backend    # postgres + mongo + redis
npm run migration:run --prefix backend # apply Prisma migrations
npm run db:seed    --prefix backend    # one user per role
```

Then a terminal per service:

```bash
cd backend  && npm run dev     # API   http://localhost:3000/api
cd frontend && npm run dev     # UI    http://localhost:8080
```

| Command                          | What it does                                   |
| -------------------------------- | ---------------------------------------------- |
| `npm run dev` in `backend/`      | API on :3000 — alias for `start:dev`           |
| `npm run dev` in `frontend/`     | Vite on :8080                                  |
| `npm run db:up` / `db:down` in `backend/` | The postgres/mongo/redis containers   |
| `bash scripts/stop-dev.sh`       | Stops both, including `--watch` supervisors    |

Ctrl+C stops a foreground `npm run dev`. Use `scripts/stop-dev.sh` when a server
was detached, when Ctrl+C left a `--watch` process behind (it holds no port but
will restart the API on the next file change), or when a port is still busy. It
only touches processes belonging to this repository, plus ports 3000 and
8080-8082.

Backend details — architecture, realtime protocol, migrations — are in
[backend/README.md](backend/README.md).

## Signing in

`npm run db:seed --prefix backend` creates one account per role, all sharing the
password `Maison!2026` (override with `SEED_PASSWORD`). Re-running it is safe —
it updates the existing rows and resets the passwords.

| Email                        | Role                      | Region     | Can                                      |
| ---------------------------- | ------------------------- | ---------- | ---------------------------------------- |
| `sysadmin@maison.co`         | `system_admin`            | all        | everything, across every organisation    |
| `owner@maison.co`            | `owner`                   | all        | everything in this workspace             |
| `region@maison.co`           | `region_head`             | West Coast | manage team, settings, audit log         |
| `sdr@maison.co`              | `sales_development_rep`   | West Coast | create and edit leads and customers      |
| `advisor@maison.co`          | `property_advisor`        | West Coast | the above, plus create and edit listings |
| `coordinator@maison.co`      | `transaction_coordinator` | West Coast | edit leads and customers                 |
| `east.region@maison.co`      | `region_head`             | East Coast | as `region@`, for the East Coast         |
| `east.sdr@maison.co`         | `sales_development_rep`   | East Coast | as `sdr@`                                |
| `east.advisor@maison.co`     | `property_advisor`        | East Coast | as `advisor@`                            |
| `east.coordinator@maison.co` | `transaction_coordinator` | East Coast | as `coordinator@`                        |

In development the sign-in page shows a role picker that fills the form for you.

`POST /api/auth/login` returns a JWT; the frontend keeps it in `localStorage`
and sends it as `Authorization: Bearer …`, and the same token authenticates the
WebSocket handshake. On the backend `JwtAuthGuard` is registered globally, so a
**new route is authenticated by default** and has to opt out:

```ts
@Public()                 // no token required — e.g. /api/health
@Roles('region_head')     // region_head or anything above it (owner, system_admin)
@CurrentUser('id') actorId: string
```

`USER_ROLES` in `backend/src/modules/users/users.types.ts` is ordered most to
least privileged and is the source of truth; `Role` in `frontend/src/data/crm.ts`
mirrors it. Adding a role means editing both, plus the seed script — which fails
loudly if a role has no seeded account.

> [!NOTE]
> The six roles are in place, but the **hierarchy is not settled**. The order in
> `USER_ROLES` is simply the order they were specified in, and `roleAtLeast`
> reads that order literally — so today `@Roles('property_advisor')` also admits
> a sales development rep. Both the ranking and the permission matrix in
> `frontend/src/data/crm.ts` are provisional and will be revisited.

## Regions

A region is a sales territory with its own team (region head, SDRs, property
advisors, transaction coordinators), its own listings, and the leads on them.
`users`, `properties` and `leads` each carry a `regionId`; a lead takes its
listing's region, or its author's for a general enquiry.

**Only `system_admin` and `owner` see across regions.** Everyone else sees only
their own region's people, listings and leads. That is enforced by the API in
`backend/src/modules/regions/region-scope.ts`, which every users/properties/leads
query goes through, not just by hiding the sidebar link. Another region's record
answers 404, so nobody can tell it exists. A regional user who hasn't been placed
in a region sees nothing regional.

Owners manage regions from **Regions** in the sidebar (`/regions`): create,
rename, delete, and move people and listings between regions. When a listing
moves, its leads move with it. Deleting a region releases its people, listings
and leads; they stay visible to owners until placed elsewhere.

`GET /api/properties` stays public for the website. With a token it narrows to
the caller's region, and the CRM always sends one.

Registration is not wired up yet: accounts are created by the seed script or by
a region head (or above) through `POST /api/users`.

## Realtime, end to end

The backend pushes; the frontend subscribes. Server side, inject one service:

```ts
this.realtime.emitToUser(userId, 'notification.created', notification);
```

Client side, one hook:

```tsx
import { useRealtimeEvent, useRealtimeRoom, Rooms } from "@/lib/realtime";

useRealtimeEvent<Notification>("notification.created", (n) => toast(n.title));

// Only entity/topic rooms need joining — user and org rooms are automatic.
useRealtimeRoom(Rooms.entity("lead", leadId));
useRealtimeEvent<Lead>("lead.updated", setLead);
```

## Known issues on this machine

**Frontend build needs a native binding that npm skips.** `package.json` pins
`overrides.rolldown` to `1.2.1`, and npm's optional-dependency bug
([npm/cli#4828](https://github.com/npm/cli/issues/4828)) leaves
two native bindings uninstalled, so `npm run build` in `frontend/` fails with
"Cannot find native binding" and `npm run dev` fails on `oxc-parser`. Both exist —
npm just does not fetch them under an override. Workaround:

```bash
npm install --no-save --prefix frontend \
  @rolldown/binding-darwin-arm64@1.2.1 \
  @oxc-parser/binding-darwin-arm64@0.120.0
```

This project's tracked lockfile is `bun.lock`; installing with `bun` avoids the
bug entirely.

**The dev origin must be in `CORS_ORIGINS`.** The backend only echoes an
`Access-Control-Allow-Origin` for listed origins, so if Vite falls back to
another port because 8080 is taken, sign-in fails with a CORS error. Add the
port it actually used to `CORS_ORIGINS` in `backend/.env`.

**DB ports are shifted off the defaults.** This machine already runs a native
Homebrew postgres on 5432 and the `hrms` stack on 5433/27017, so the compose
project `maison-crm` publishes postgres on **5434** and mongo on **27018**. The
container/port table is in [backend/README.md](backend/README.md).

## Lovable

This repo is connected to Lovable, whose editor expects the TanStack app at the
repository root. Moving it into `frontend/` will likely break that sync — the
move is plain `git mv`, so it is reversible if you need the integration back.

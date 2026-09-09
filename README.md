# Maison CRM

Monorepo with a single git repository at the root.

```
maison-crm-core/
├── frontend/    TanStack Start + React 19 + Tailwind (the existing CRM UI)
├── backend/     NestJS + PostgreSQL (Prisma) + MongoDB (Mongoose) + Socket.IO
└── .lovable/    Lovable project config
```

## Requirements

Node **>= 20.19** — the backend toolchain needs it. `.nvmrc` pins 22.21.1.

## Quick start

```bash
nvm use
npm run install:all

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

npm run db:up                              # postgres + mongo + redis
npm run migration:run --prefix backend     # apply Prisma migrations

npm run dev:backend    # http://localhost:3000/api
npm run dev:frontend   # http://localhost:8080
```

`npm run dev` starts both at once. Backend details — architecture, realtime
protocol, migrations — are in [backend/README.md](backend/README.md).

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
two native bindings uninstalled, so `npm run build` fails with "Cannot find
native binding" and `npm run dev` fails on `oxc-parser`. Both packages exist —
npm just does not fetch them under an override. Workaround:

```bash
npm install --no-save --prefix frontend \
  @rolldown/binding-darwin-arm64@1.2.1 \
  @oxc-parser/binding-darwin-arm64@0.120.0
```

This project's tracked lockfile is `bun.lock`; installing with `bun` avoids the
bug entirely.

**DB ports are shifted off the defaults.** This machine already runs a native
Homebrew postgres on 5432 and the `hrms` stack on 5433/27017, so the compose
project `maison-crm` publishes postgres on **5434** and mongo on **27018**. The
container/port table is in [backend/README.md](backend/README.md).

## Lovable

This repo is connected to Lovable, whose editor expects the TanStack app at the
repository root. Moving it into `frontend/` will likely break that sync — the
move is plain `git mv`, so it is reversible if you need the integration back.

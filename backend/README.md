# Maison CRM — Backend

NestJS + TypeScript API for the Maison CRM.

- **PostgreSQL (Prisma)** — structured, relational records: users, leads, customers, deals.
- **MongoDB (Mongoose)** — schema-flexible data: audit logs, notifications, activity feeds.
- **Socket.IO** — realtime push, wired as a drop-in module (see [Realtime](#realtime)).

## Requirements

Node **>= 20.19** (`.nvmrc` pins 22.21.1). The Nest 12 CLI `require()`s an ESM
dependency, which older Node cannot do.

## Getting started

```bash
nvm use                 # or any Node >= 20.19
npm install
cp .env.example .env    # adjust if your ports differ
npm run db:up           # postgres + mongo + redis via docker compose
npm run migration:run   # create the schema
npm run start:dev
```

- REST — <http://localhost:3000/api>
- Swagger — <http://localhost:3000/api/docs> (non-production only)
- WebSocket — `ws://localhost:3000/realtime`
- Health — <http://localhost:3000/api/health> (checks both databases and the gateway)

### Container names and ports

The stack runs under the compose project **`maison-crm`**, so its containers,
volumes and network never collide with the `hrms` stack on this machine:

| Service | Container | Host port | Why not the default |
| --- | --- | --- | --- |
| Postgres | `maison-crm-postgres` | **5434** | 5432 is the native Homebrew postgres, 5433 is `hrms-postgres` |
| Mongo | `maison-crm-mongo` | **27018** | 27017 is `hrms-mongo` |
| Redis | `maison-crm-redis` | 6379 | free |

`docker compose` reads the same `.env` the app does, so `POSTGRES_PORT` /
`MONGO_PORT` / `REDIS_PORT` set both the published port and the port the app
dials. Change a port there and both sides stay in sync — except `MONGO_URI`,
which repeats the port and must be edited alongside `MONGO_PORT`.

Optional database browsers are behind a compose profile, so they stay off unless
asked for:

```bash
docker compose --profile tools up -d   # Adminer :8081, mongo-express :8082
```

## Layout

```
src/
├── config/              env loading + fail-fast production validation
├── database/
│   ├── prisma/          PrismaClient as an injectable Nest provider
│   └── mongo/           Mongoose connection
├── generated/prisma/    Prisma Client — generated, git-ignored
├── common/              pagination, exception filter, interceptor
├── realtime/            the plug-and-play WebSocket module
└── modules/
    ├── users/           worked example: Postgres + audit trail + realtime
    ├── audit-log/       Mongo, global — inject AuditLogService anywhere
    ├── notifications/   Mongo + realtime push
    └── health/
```

## Realtime

`RealtimeModule` is `@Global()`, so **any provider can push to clients by
injecting one service** — no imports, no socket handling:

```ts
constructor(private readonly realtime: RealtimeService) {}

this.realtime.emitToUser(userId, 'notification.created', notification);
this.realtime.emitToOrg(orgId, 'lead.created', lead);
this.realtime.emitToEntity('lead', leadId, 'lead.updated', lead);
this.realtime.emitToTopic('dashboard-metrics', 'metrics.tick', metrics);
this.realtime.broadcast('system.maintenance', { at });
```

Also available: `getRoomMembers()`, `isUserOnline()`, `disconnectUser()`.
Emitting before the gateway is up (jobs, CLI, tests) is a logged no-op rather
than a crash — delivery is best-effort by design.

### Rooms

Rooms are the contract between publisher and subscriber; build them with the
`Rooms` helper rather than raw strings.

| Room                    | Who is in it                        | Joined         |
| ----------------------- | ----------------------------------- | -------------- |
| `user:<id>`             | every tab/device of one user        | automatically  |
| `org:<id>`              | everyone in an organisation         | automatically  |
| `entity:<type>:<id>`    | everyone viewing one record         | client asks    |
| `topic:<name>`          | any free-form channel               | client asks    |

`user:` and `org:` are joined at handshake from the JWT, so you can emit to a
user who has never subscribed to anything.

### Client protocol

Connect to the `/realtime` namespace with a JWT, then:

| Direction | Message | Payload |
| --------- | ------- | ------- |
| → server  | `subscribe` / `unsubscribe` | `{ room }` |
| → server  | `ping` | — |
| ← client  | `connected` | `{ socketId, userId, orgId, anonymous }` |
| ← client  | `subscribed` / `unsubscribed` | `{ room }` |
| ← client  | `error` | `{ message, emittedAt }` |
| ← client  | *your events* | `{ event, room, payload, emittedAt }` |

Every server → client message uses that same envelope, so `payload` is always
where the data is.

### Authentication

The handshake reads a JWT from `auth.token`, an `Authorization: Bearer` header,
or a `token` query param, and caches the principal on `socket.data`.

`WS_ALLOW_ANONYMOUS=true` (dev default) lets unauthenticated clients connect
with public `topic:` access only. **Set it to `false` in production.**

### Authorization

`RealtimeAccessPolicy` decides which rooms a client may join — own user room,
own org, any entity/topic. It is one small class; override the provider in
`RealtimeModule` to plug in record-level ACLs.

### Scaling out

Set `REDIS_URL` and the Socket.IO Redis adapter is enabled at boot, so an emit
on one instance reaches sockets held by any other. Leave it empty for a single
instance. No application code changes either way.

### Reusing this in another service

`src/realtime/` has no dependency on any feature module. Copy the folder, import
`RealtimeModule`, done.

## Database notes

**Postgres** is migration-driven through Prisma. The schema lives in
`prisma/schema.prisma`; edit it, then:

```bash
npm run migration:create -- add_leads   # dev: writes + applies a migration
npm run migration:run                   # prod/CI: applies committed migrations
npm run migration:status
npm run db:studio                       # browse the data
```

`prisma generate` rebuilds the typed client into `src/generated/prisma`. It runs
on `postinstall`, so a fresh clone is ready after `npm install` — but rerun
`npm run prisma:generate` after editing the schema.

New models need no module wiring: `PrismaModule` is `@Global()`, so a service
just injects `PrismaService`.

Two things Prisma does not do for you:

- **Soft deletes are manual.** TypeORM hid `deletedAt` rows automatically;
  Prisma does not. Every read must pass `deletedAt: null` — see `UsersService`.
- **Connection URLs live outside the schema.** Prisma 7 removed `url` from
  `datasource`, so migrations read `DATABASE_URL` via `prisma.config.ts` and the
  app connects through the `@prisma/adapter-pg` driver adapter in
  `PrismaService`.

UUID primary keys use `gen_random_uuid()`, built into Postgres 13+, so a fresh
database needs no superuser-installed extension.

**Mongo** collections are defined by `@Schema()` classes under each module's
`schemas/` folder.

## Environment

See `.env.example` for the full list. `validateEnv` fails the boot in production
when a required variable is missing or when `JWT_SECRET` is still the default.

`DATABASE_URL` is what Prisma actually connects with. The discrete `POSTGRES_*`
variables remain because docker-compose uses them to initialise the server, and
the app falls back to composing a URL from them if `DATABASE_URL` is unset —
but the Prisma CLI always needs `DATABASE_URL`, so keep the two in step.

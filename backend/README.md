# Maison CRM — Backend

NestJS + TypeScript API for the Maison CRM.

- **PostgreSQL (TypeORM)** — structured, relational records: users, leads, customers, deals.
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

If ports 5432/27017 are already taken, override the host ports without touching
the app config:

```bash
POSTGRES_PORT=5434 MONGO_PORT=27018 npm run db:up
```

…then point `POSTGRES_PORT` / `MONGO_URI` in `.env` at the same values.

## Layout

```
src/
├── config/              env loading + fail-fast production validation
├── database/
│   ├── postgres/        TypeORM connection, CLI data-source, migrations
│   └── mongo/           Mongoose connection
├── common/              base entity, pagination, exception filter, interceptor
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

**Postgres** is migration-driven. `POSTGRES_SYNCHRONIZE` exists for early local
work and is rejected outright in production.

```bash
npm run migration:generate -- src/database/postgres/migrations/AddLeads
npm run migration:run
npm run migration:revert
```

New entities need no wiring in `PostgresModule` — `autoLoadEntities` picks up
whatever a module registers via `TypeOrmModule.forFeature([...])`.

UUID primary keys use `gen_random_uuid()` (built into Postgres 13+) via
`uuidExtension: 'pgcrypto'`, so migrations run on a fresh database without a
superuser installing `uuid-ossp` first.

**Mongo** collections are defined by `@Schema()` classes under each module's
`schemas/` folder.

## Environment

See `.env.example` for the full list. `validateEnv` fails the boot in production
when a required variable is missing, when `JWT_SECRET` is still the default, or
when `POSTGRES_SYNCHRONIZE` is on.

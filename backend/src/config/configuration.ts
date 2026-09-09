const toBool = (value: string | undefined, fallback = false): boolean =>
  value === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const buildPostgresUrl = (): string => {
  const user = encodeURIComponent(process.env.POSTGRES_USER ?? 'maison');
  const password = encodeURIComponent(process.env.POSTGRES_PASSWORD ?? 'maison');
  const host = process.env.POSTGRES_HOST ?? 'localhost';
  const port = toInt(process.env.POSTGRES_PORT, 5432);
  const database = process.env.POSTGRES_DB ?? 'maison_crm';
  return `postgresql://${user}:${password}@${host}:${port}/${database}?schema=public`;
};

export const configuration = () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: toInt(process.env.PORT, 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigins: toList(process.env.CORS_ORIGINS),

  postgres: {
    /**
     * Prisma connects with a single URL. `DATABASE_URL` wins so the app and the
     * Prisma CLI always agree; the discrete POSTGRES_* parts remain as a
     * fallback because docker-compose still uses them to initialise the server.
     */
    url: process.env.DATABASE_URL || buildPostgresUrl(),
    logging: toBool(process.env.POSTGRES_LOGGING, false),
    ssl: toBool(process.env.POSTGRES_SSL, false),
  },

  mongo: {
    uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/maison_crm',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },

  realtime: {
    namespace: process.env.WS_NAMESPACE ?? '/realtime',
    path: process.env.WS_PATH ?? '/socket.io',
    allowAnonymous: toBool(process.env.WS_ALLOW_ANONYMOUS, false),
    redisUrl: process.env.REDIS_URL || undefined,
  },
});

export type AppConfig = ReturnType<typeof configuration>;

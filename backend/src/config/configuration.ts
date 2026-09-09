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

export const configuration = () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: toInt(process.env.PORT, 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigins: toList(process.env.CORS_ORIGINS),

  postgres: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: toInt(process.env.POSTGRES_PORT, 5432),
    username: process.env.POSTGRES_USER ?? 'maison',
    password: process.env.POSTGRES_PASSWORD ?? 'maison',
    database: process.env.POSTGRES_DB ?? 'maison_crm',
    synchronize: toBool(process.env.POSTGRES_SYNCHRONIZE, false),
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

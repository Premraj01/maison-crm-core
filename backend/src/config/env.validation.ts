import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

const REQUIRED_IN_PRODUCTION = [
  'POSTGRES_HOST',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'MONGO_URI',
  'JWT_SECRET',
];

/**
 * Fails fast on a misconfigured production boot, and stays quiet-but-loud in
 * development so a fresh clone still runs with the defaults in `.env.example`.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const isProduction = config.NODE_ENV === 'production';
  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !config[key]);

  if (missing.length > 0) {
    const message = `Missing environment variables: ${missing.join(', ')}`;
    if (isProduction) throw new Error(message);
    logger.warn(`${message} — falling back to development defaults.`);
  }

  if (isProduction && config.JWT_SECRET === 'change-me-in-production') {
    throw new Error('JWT_SECRET must be changed before running in production.');
  }

  if (isProduction && ['1', 'true', 'yes'].includes(String(config.POSTGRES_SYNCHRONIZE))) {
    throw new Error('POSTGRES_SYNCHRONIZE must be false in production — use migrations.');
  }

  return config;
}

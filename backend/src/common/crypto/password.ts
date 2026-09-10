import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * scrypt from `node:crypto` rather than bcrypt/argon2 — memory-hard, part of
 * the standard library, and no native build step in CI or Docker.
 *
 * Cost is stored alongside the digest, so raising `SCRYPT_PARAMS` later keeps
 * existing hashes verifiable: each one is checked with the parameters it was
 * created with.
 */
const SCRYPT_PARAMS = { N: 2 ** 15, r: 8, p: 1 } as const;

/** scrypt needs roughly `128 * N * r` bytes; the node default of 32 MB is short of that. */
const MAX_MEM = 64 * 1024 * 1024;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const ALGORITHM = 'scrypt';

/** `scrypt$N$r$p$<base64 salt>$<base64 key>` — self-describing, one varchar. */
export async function hashPassword(plain: string): Promise<string> {
  const { N, r, p } = SCRYPT_PARAMS;
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(plain, salt, KEY_LENGTH, { N, r, p, maxmem: MAX_MEM });

  return [ALGORITHM, N, r, p, salt.toString('base64'), derived.toString('base64')].join('$');
}

/**
 * Returns false rather than throwing on a malformed digest, so a corrupted row
 * fails the sign-in instead of returning a 500 that confirms the account exists.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parsed = parse(stored);
  if (!parsed) return false;

  const derived = await scrypt(plain, parsed.salt, parsed.key.length, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
    maxmem: MAX_MEM,
  });

  return timingSafeEqual(derived, parsed.key);
}

interface ParsedHash {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  key: Buffer;
}

function parse(stored: string): ParsedHash | null {
  const [algorithm, n, r, p, salt, key] = stored.split('$');
  if (algorithm !== ALGORITHM || !salt || !key) return null;

  const parsed = {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    salt: Buffer.from(salt, 'base64'),
    key: Buffer.from(key, 'base64'),
  };

  const costsValid = [parsed.N, parsed.r, parsed.p].every(
    (value) => Number.isInteger(value) && value > 0,
  );
  return costsValid && parsed.salt.length > 0 && parsed.key.length > 0 ? parsed : null;
}

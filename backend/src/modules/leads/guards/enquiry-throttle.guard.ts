import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';

/** Enquiries allowed from one address within the window. */
const LIMIT = 5;

/** Sliding window, in milliseconds. */
const WINDOW_MS = 10 * 60 * 1000;

/** How often expired buckets are swept, so the map cannot grow without bound. */
const SWEEP_MS = 60 * 1000;

/**
 * Rate limit for the one route in this API that writes without a token.
 *
 * Deliberately small and dependency-free: it holds timestamps per address in
 * this process's memory. That is enough to stop a form being hammered into
 * thousands of junk leads, and it is honest about what it is not — with several
 * backend instances each keeps its own count, so the effective limit multiplies
 * by the instance count. Move to `@nestjs/throttler` backed by the Redis this
 * stack already runs if that ever matters.
 */
@Injectable()
export class EnquiryThrottleGuard implements CanActivate {
  private readonly logger = new Logger(EnquiryThrottleGuard.name);
  private readonly hits = new Map<string, number[]>();
  private lastSweep = Date.now();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.ip ?? 'unknown';
    const now = Date.now();

    this.sweep(now);

    const recent = (this.hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
    if (recent.length >= LIMIT) {
      this.logger.warn(`Enquiry rate limit hit by ${key}`);
      throw new HttpException(
        'Too many enquiries from this address. Please try again shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  /** Drops addresses whose entries have all expired. */
  private sweep(now: number): void {
    if (now - this.lastSweep < SWEEP_MS) return;
    this.lastSweep = now;
    for (const [key, times] of this.hits) {
      const live = times.filter((at) => now - at < WINDOW_MS);
      if (live.length === 0) this.hits.delete(key);
      else this.hits.set(key, live);
    }
  }
}

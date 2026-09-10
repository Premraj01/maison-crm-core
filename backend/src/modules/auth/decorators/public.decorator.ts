import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:isPublic';

/**
 * Opts a route out of the globally registered `JwtAuthGuard`. Everything is
 * authenticated unless it carries this — the safe default for a new endpoint.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

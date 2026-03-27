import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Only init redis if env exists (allows local dev without redis gracefully failing open if preferred, or just rely on Vercel env)
const redis = process.env.UPSTASH_REDIS_REST_URL 
  ? Redis.fromEnv() 
  : null;

export const chatRatelimit = redis 
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      analytics: true,
    })
  : null;

export const uploadRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
    })
  : null;

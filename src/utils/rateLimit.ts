type RateLimitConfig = {
  maxAttempts: number;
  windowMs: number;
};

type RateLimitState = {
  timestamps: number[];
};

type BackoffConfig = {
  maxFailuresBeforeBackoff: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
};

type BackoffState = {
  failures: number;
  blockedUntilMs: number;
};

const limitState = new Map<string, RateLimitState>();
const backoffState = new Map<string, BackoffState>();

export type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

export type BackoffResult = {
  blocked: boolean;
  retryAfterMs: number;
};

const pruneOldTimestamps = (timestamps: number[], windowMs: number, now: number): number[] => {
  const earliestAllowed = now - windowMs;
  return timestamps.filter((timestamp) => timestamp > earliestAllowed);
};

export const checkRateLimit = (
  key: string,
  config: RateLimitConfig
): RateLimitResult => {
  const now = Date.now();
  const existing = limitState.get(key) || { timestamps: [] };
  const activeTimestamps = pruneOldTimestamps(existing.timestamps, config.windowMs, now);

  if (activeTimestamps.length >= config.maxAttempts) {
    const oldestTimestamp = activeTimestamps[0];
    const retryAfterMs = Math.max(config.windowMs - (now - oldestTimestamp), 0);

    limitState.set(key, { timestamps: activeTimestamps });

    return {
      allowed: false,
      retryAfterMs,
    };
  }

  activeTimestamps.push(now);
  limitState.set(key, { timestamps: activeTimestamps });

  return {
    allowed: true,
    retryAfterMs: 0,
  };
};

const getBackoffDurationMs = (failureCount: number, config: BackoffConfig): number => {
  const exponent = Math.max(failureCount - config.maxFailuresBeforeBackoff, 0);
  const computedDelay = config.initialBackoffMs * Math.pow(2, exponent);
  return Math.min(computedDelay, config.maxBackoffMs);
};

export const checkBackoff = (key: string): BackoffResult => {
  const now = Date.now();
  const existing = backoffState.get(key);

  if (!existing || existing.blockedUntilMs <= now) {
    return {
      blocked: false,
      retryAfterMs: 0,
    };
  }

  return {
    blocked: true,
    retryAfterMs: existing.blockedUntilMs - now,
  };
};

export const registerBackoffFailure = (key: string, config: BackoffConfig): BackoffResult => {
  const now = Date.now();
  const existing = backoffState.get(key) || { failures: 0, blockedUntilMs: 0 };
  const failureCount = existing.failures + 1;

  if (failureCount < config.maxFailuresBeforeBackoff) {
    backoffState.set(key, {
      failures: failureCount,
      blockedUntilMs: 0,
    });

    return {
      blocked: false,
      retryAfterMs: 0,
    };
  }

  const backoffMs = getBackoffDurationMs(failureCount, config);
  backoffState.set(key, {
    failures: failureCount,
    blockedUntilMs: now + backoffMs,
  });

  return {
    blocked: true,
    retryAfterMs: backoffMs,
  };
};

export const resetBackoff = (key: string): void => {
  backoffState.delete(key);
};

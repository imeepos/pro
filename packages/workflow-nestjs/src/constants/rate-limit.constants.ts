export const RATE_LIMIT_CONFIGS = {
  ACCOUNT: { limit: 30, windowMs: 60 * 1000 },
  GLOBAL: { limit: 100, windowMs: 60 * 1000 },
  IP: { limit: 50, windowMs: 60 * 1000 },
  STRICT: { limit: 10, windowMs: 60 * 1000 },
};

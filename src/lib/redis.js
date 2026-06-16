import Redis from 'ioredis';

let cached = global.__redis;
if (!cached) {
  cached = global.__redis = { client: null, disabled: false };
}

export function getRedis() {
  if (cached.disabled) return null;
  if (cached.client) return cached.client;

  const url = process.env.REDIS_URL;
  if (!url) {
    cached.disabled = true;
    return null;
  }

  try {
    cached.client = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
      reconnectOnError: () => true,
    });
    cached.client.on('error', (err) => {
      // Avoid log spam — only log unique messages
      if (cached.lastError !== err.message) {
        cached.lastError = err.message;
        console.error('[redis] error:', err.message);
      }
    });
    cached.client.on('ready', () => {
      cached.lastError = null;
    });
  } catch (err) {
    console.error('[redis] init failed:', err.message);
    cached.disabled = true;
    return null;
  }
  return cached.client;
}

export function isRedisConfigured() {
  return !!process.env.REDIS_URL;
}

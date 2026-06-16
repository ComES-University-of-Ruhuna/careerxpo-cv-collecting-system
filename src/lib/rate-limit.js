import { getRedis } from './redis';

const rateMap = new Map();
const CLEANUP_INTERVAL = 60 * 1000;
let lastCleanup = Date.now();

function cleanupMemory() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of rateMap) {
    if (now > entry.resetAt) rateMap.delete(key);
  }
}

function memoryRateLimit(key, limit, windowMs) {
  cleanupMemory();
  const now = Date.now();
  let entry = rateMap.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    rateMap.set(key, entry);
  }
  entry.count++;
  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

async function redisRateLimit(redis, key, limit, windowMs) {
  const redisKey = `ratelimit:${key}`;
  const result = await redis
    .multi()
    .incr(redisKey)
    .pttl(redisKey)
    .exec();
  const count = result[0][1];
  const ttl = result[1][1];

  let resetAt;
  if (count === 1 || ttl < 0) {
    await redis.pexpire(redisKey, windowMs);
    resetAt = Date.now() + windowMs;
  } else {
    resetAt = Date.now() + ttl;
  }

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}

/**
 * Distributed rate limiter (Redis-backed with in-memory fallback).
 * @param {string} key - Unique key (e.g., IP + endpoint)
 * @param {number} limit - Max requests allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Promise<{ allowed: boolean, remaining: number, resetAt: number }>}
 */
export async function rateLimit(key, limit = 10, windowMs = 15 * 60 * 1000) {
  const redis = getRedis();
  if (redis) {
    try {
      return await redisRateLimit(redis, key, limit, windowMs);
    } catch (err) {
      console.error('[rate-limit] redis failed, falling back to memory:', err.message);
    }
  }
  return memoryRateLimit(key, limit, windowMs);
}

/**
 * Get client IP from request headers (supports proxies).
 */
export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

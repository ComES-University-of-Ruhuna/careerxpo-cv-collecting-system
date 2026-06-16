import { getRedis } from './redis';

const DEFAULT_TTL = 60;

export async function cacheGet(key) {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('[cache] get failed:', key, err.message);
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = DEFAULT_TTL) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.error('[cache] set failed:', key, err.message);
  }
}

export async function cacheGetOrSet(key, ttlSeconds, fetcher) {
  const cached = await cacheGet(key);
  if (cached !== null) return cached;
  const fresh = await fetcher();
  if (fresh !== undefined && fresh !== null) {
    await cacheSet(key, fresh, ttlSeconds);
  }
  return fresh;
}

export async function cacheDelete(...keys) {
  if (!keys.length) return;
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    console.error('[cache] delete failed:', err.message);
  }
}

export async function cacheDeletePattern(pattern) {
  const redis = getRedis();
  if (!redis) return;
  try {
    const stream = redis.scanStream({ match: pattern, count: 100 });
    const pipeline = redis.pipeline();
    let count = 0;
    for await (const keys of stream) {
      for (const k of keys) {
        pipeline.del(k);
        count++;
      }
    }
    if (count) await pipeline.exec();
  } catch (err) {
    console.error('[cache] delete pattern failed:', pattern, err.message);
  }
}

export const CacheKeys = {
  studentCompanies: (department) => `student:companies:${department || 'all'}`,
  studentCompaniesPattern: () => 'student:companies:*',
  studentLinkedInJobs: () => 'student:linkedin-jobs',
  adminStats: () => 'admin:stats',
};

export const CacheTTL = {
  studentCompanies: 60,
  studentLinkedInJobs: 60,
  adminStats: 30,
};

export async function invalidateCompanyCaches() {
  await Promise.all([
    cacheDeletePattern(CacheKeys.studentCompaniesPattern()),
    cacheDelete(CacheKeys.adminStats()),
  ]);
}

export async function invalidateLinkedInJobCaches() {
  await cacheDelete(CacheKeys.studentLinkedInJobs());
}

export async function invalidateStatsCache() {
  await cacheDelete(CacheKeys.adminStats());
}

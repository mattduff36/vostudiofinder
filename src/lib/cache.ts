// Optional Redis import - gracefully handle if not available
let Redis: any;
try {
  Redis = require('ioredis').Redis;
} catch {
  // Redis not available - caching will be disabled
  Redis = null;
}

// Initialize Redis client (only if available and configured)
const redis = Redis && process.env.REDIS_URL ? new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 1, // Reduce retries for faster failure
  lazyConnect: true,
}) : null;

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class Cache {
  private static instance: Cache;
  private redis: any;

  private constructor() {
    this.redis = redis;
  }

  public static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache();
    }
    return Cache.instance;
  }

  private getKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || process.env.CACHE_PREFIX || 'vsf';
    return `${keyPrefix}:${key}`;
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.redis) return null;
    
    try {
      const fullKey = this.getKey(key, options.prefix);
      const value = await this.redis.get(fullKey);
      
      if (value) {
        return JSON.parse(value);
      }
      
      return null;
    } catch {
      // Cache get error - fallback to no cache
      return null;
    }
  }

  async set(
    key: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      const fullKey = this.getKey(key, options.prefix);
      const serializedValue = JSON.stringify(value);
      const ttl = options.ttl || 3600; // Default 1 hour

      await this.redis.setex(fullKey, ttl, serializedValue);
      return true;
    } catch {
      // Cache set error - continue without caching
      return false;
    }
  }

  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options.prefix);
      await this.redis.del(fullKey);
      return true;
    } catch {
      // Cache delete error - continue
      return false;
    }
  }

  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options.prefix);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch {
      // Cache exists error - return false
      return false;
    }
  }

  async invalidatePattern(pattern: string, options: CacheOptions = {}): Promise<void> {
    try {
      const fullPattern = this.getKey(pattern, options.prefix);
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch {
      // Cache invalidate pattern error - continue
    }
  }

  // Search-specific cache methods
  async cacheSearchResults(
    searchKey: string,
    results: any,
    ttl: number = 300 // 5 minutes default for search results
  ): Promise<void> {
    await this.set(`search:${searchKey}`, results, { ttl, prefix: 'search' });
  }

  async getCachedSearchResults<T>(searchKey: string): Promise<T | null> {
    return this.get<T>(`search:${searchKey}`, { prefix: 'search' });
  }

  async invalidateSearchCache(): Promise<void> {
    await this.invalidatePattern('*', { prefix: 'search' });
  }
}

export const cache = Cache.getInstance();

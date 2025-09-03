import { Redis } from 'ioredis';

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class Cache {
  private static instance: Cache;
  private redis: Redis;

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
    try {
      const fullKey = this.getKey(key, options.prefix);
      const value = await this.redis.get(fullKey);
      
      if (value) {
        return JSON.parse(value);
      }
      
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(
    key: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options.prefix);
      const serializedValue = JSON.stringify(value);
      const ttl = options.ttl || 3600; // Default 1 hour

      await this.redis.setex(fullKey, ttl, serializedValue);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options.prefix);
      await this.redis.del(fullKey);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options.prefix);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
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
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
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

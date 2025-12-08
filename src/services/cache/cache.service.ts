import { Redis } from 'ioredis';

import { config, createModuleLogger, type ICacheService } from '../../core/index.js';

const logger = createModuleLogger('cache-service');

export class RedisCacheService implements ICacheService {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('error', (err: Error) => {
      logger.error('Redis connection error', { error: err });
    });

    this.client.on('connect', () => {
      logger.info(`Connected to Redis at ${config.redis.host}:${config.redis.port}`);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Cache get error for key: ${key}`, { error });
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl ?? config.redis.ttl;
      await this.client.setex(key, expiry, serialized);
    } catch (error) {
      logger.error(`Cache set error for key: ${key}`, { error });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key: ${key}`, { error });
    }
  }

  async clear(): Promise<void> {
    try {
      await this.client.flushdb();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Cache clear error', { error });
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key: ${key}`, { error });
      return false;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

export class MemoryCacheService implements ICacheService {
  private readonly cache = new Map<string, { value: unknown; expires: number }>();

  constructor() {
    // Cleanup expired entries every 5 minutes
    setInterval(
      () => {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
          if (entry.expires < now) {
            this.cache.delete(key);
          }
        }
      },
      5 * 60 * 1000
    );
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const expires = Date.now() + (ttl ?? config.redis.ttl) * 1000;
    this.cache.set(key, { value, expires });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
}

// Factory function
export function createCacheService(): ICacheService {
  // Use Redis if available, fallback to memory cache
  try {
    return new RedisCacheService();
  } catch {
    logger.warn('Redis not available, using memory cache');
    return new MemoryCacheService();
  }
}

export const cacheService = createCacheService();

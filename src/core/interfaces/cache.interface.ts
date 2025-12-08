/**
 * Cache Service Interface
 * Defines the contract for caching operations across different backends (Redis, Memory, etc.)
 */
export interface ICacheService {
  /**
   * Get a value from cache
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache with optional TTL
   */
  set(key: string, value: unknown, ttl?: number): Promise<void>;

  /**
   * Delete a value from cache
   */
  delete(key: string): Promise<void>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Check if a key exists in cache
   */
  exists(key: string): Promise<boolean>;
}


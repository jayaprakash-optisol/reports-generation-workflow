import { config, createSingleton, type IStorageService } from '../../core/index.js';

import { LocalStorageService } from './local-storage.service.js';
import { MinioStorageService } from './minio-storage.service.js';

/**
 * Storage service factory
 * Returns the appropriate storage implementation based on configuration
 */
function createStorageService(): IStorageService {
  if (config.storage.type === 'minio') {
    return new MinioStorageService();
  }
  return new LocalStorageService();
}

/**
 * Get the singleton storage service instance
 */
export const getStorageService = createSingleton(createStorageService);

/**
 * Convenience export for backward compatibility
 */
export const storage = getStorageService();

// Export classes for direct instantiation if needed
export { LocalStorageService } from './local-storage.service.js';
export { MinioStorageService } from './minio-storage.service.js';


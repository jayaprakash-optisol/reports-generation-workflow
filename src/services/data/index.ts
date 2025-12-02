import { createSingleton, type IDataProfiler } from '../../core/index.js';

import { DataProfiler } from './data-profiler.service.js';

/**
 * Get the singleton data profiler instance
 */
export const getDataProfiler = createSingleton<IDataProfiler>(() => new DataProfiler());

/**
 * Convenience export for backward compatibility
 */
export const dataProfiler = getDataProfiler();

export { DataProfiler } from './data-profiler.service.js';


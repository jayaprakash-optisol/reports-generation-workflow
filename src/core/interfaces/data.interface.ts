import type { DataProfile, InputData } from '../../shared/types/index.js';

/**
 * Data Profiler Interface
 * Defines the contract for data profiling operations
 */
export interface IDataProfiler {
  /**
   * Profile input data and generate insights about structure
   */
  profileData(inputData: InputData[]): Promise<{
    profile: DataProfile;
    parsedData: Record<string, unknown>[];
    textContent: string[];
  }>;
}


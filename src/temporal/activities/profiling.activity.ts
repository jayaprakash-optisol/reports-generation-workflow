import { createModuleLogger } from '../../core/index.js';
import { dataProfiler, storage } from '../../services/index.js';
import type { DataProfile, InputData } from '../../shared/types/index.js';

const logger = createModuleLogger('profiling-activity');

// ============================================================================
// Activity: Profile Data
// ============================================================================

export interface ProfileDataInput {
  reportId: string;
  inputData: InputData[];
}

export interface ProfileDataOutput {
  profile: DataProfile;
  parsedData: Record<string, unknown>[];
  textContent: string[];
}

export async function profileData(input: ProfileDataInput): Promise<ProfileDataOutput> {
  logger.info(`Profiling data for report: ${input.reportId}`);

  const { profile, parsedData, textContent } = await dataProfiler.profileData(input.inputData);

  // Store intermediate result
  await storage.saveReport(input.reportId, {
    status: 'DATA_PROFILING',
    dataProfile: profile,
  });

  logger.info(`Data profiling complete: ${profile.rowCount} rows, ${profile.columnCount} columns`);

  return { profile, parsedData, textContent };
}


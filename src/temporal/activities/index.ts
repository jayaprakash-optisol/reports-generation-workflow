// Re-export all activities
export {
  exportFormats,
  type ExportFormatsInput,
  finalizeReport,
  type FinalizeReportInput,
  updateReportStatus,
  type UpdateStatusInput,
} from './export.activity.js';
export {
  generateCharts,
  type GenerateChartsInput,
  generateInsights,
  type GenerateInsightsInput,
  renderLayout,
  type RenderLayoutInput,
} from './generation.activity.js';
export {
  profileData,
  type ProfileDataInput,
  type ProfileDataOutput,
} from './profiling.activity.js';

// Import and re-export all activities as a single object
import { exportFormats, finalizeReport, updateReportStatus } from './export.activity.js';
import { generateCharts, generateInsights, renderLayout } from './generation.activity.js';
import { profileData } from './profiling.activity.js';

export const activities = {
  profileData,
  generateInsights,
  generateCharts,
  renderLayout,
  exportFormats,
  finalizeReport,
  updateReportStatus,
};

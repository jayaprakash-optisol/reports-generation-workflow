import { z } from 'zod';

import type { ChartSuggestion } from './chart.types.js';
import {
  BrandingSchema,
  ColumnTypeSchema,
  OutputFormatSchema,
  ReportStyleSchema,
  type ColumnProfile,
  type OutputFormat,
  type ReportStatus,
  type ReportStyle,
  type TableData,
} from './common.types.js';

// ============================================================================
// Data Profile
// ============================================================================

export interface DataProfile {
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  dataQualityScore: number;
  suggestedCharts: ChartSuggestion[];
}

// ============================================================================
// Report Sections
// ============================================================================

export interface ReportSection {
  id: string;
  title: string;
  type: 'text' | 'chart' | 'table' | 'image' | 'mixed';
  content?: string;
  chartId?: string;
  tableData?: TableData;
  imageUrl?: string;
  order: number;
}

// ============================================================================
// Report Configuration
// ============================================================================

export const ReportConfigSchema = z.object({
  title: z.string().min(1).max(200),
  style: ReportStyleSchema.default('business'),
  outputFormats: z.array(OutputFormatSchema).min(1).default(['PDF']),
  branding: BrandingSchema.optional(),
  sectionsToInclude: z.array(z.string()).optional(),
  sectionsToExclude: z.array(z.string()).optional(),
  authorName: z.string().optional(),
  customPromptInstructions: z.string().max(1000).optional(),
});
export type ReportConfig = z.infer<typeof ReportConfigSchema>;

// ============================================================================
// Input Data
// ============================================================================

export const StructuredDataSchema = z.object({
  type: z.literal('structured'),
  format: z.enum(['json', 'csv', 'xlsx']),
  data: z.union([z.string(), z.array(z.record(z.unknown()))]),
  schemaHints: z.record(ColumnTypeSchema).optional(),
  // For xlsx files uploaded via multipart, this contains the sheet name to use (optional)
  sheetName: z.string().optional(),
});
export type StructuredData = z.infer<typeof StructuredDataSchema>;

export const UnstructuredDataSchema = z.object({
  type: z.literal('unstructured'),
  format: z.enum(['text', 'markdown']),
  content: z.string().max(100000),
});
export type UnstructuredData = z.infer<typeof UnstructuredDataSchema>;

export const InputDataSchema = z.discriminatedUnion('type', [
  StructuredDataSchema,
  UnstructuredDataSchema,
]);
export type InputData = z.infer<typeof InputDataSchema>;

// ============================================================================
// Report Request & Response
// ============================================================================

export const CreateReportRequestSchema = z.object({
  data: z.array(InputDataSchema).min(1),
  config: ReportConfigSchema,
});
export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>;

// Batch request schema
export const BatchReportRequestSchema = z.object({
  requests: z.array(CreateReportRequestSchema).min(1).max(50),
});
export type BatchReportRequest = z.infer<typeof BatchReportRequestSchema>;

export interface ReportMetadata {
  id: string;
  title: string;
  style: ReportStyle;
  status: ReportStatus;
  outputFormats: OutputFormat[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  errorMessage?: string;
  progress?: number;
  currentStep?: string;
}

export interface ReportFile {
  format: OutputFormat;
  url: string;
  size: number;
  generatedAt: string;
}

export interface Report extends ReportMetadata {
  files?: ReportFile[];
  dataProfile?: DataProfile;
  sections?: ReportSection[];
}

// ============================================================================
// Workflow Types
// ============================================================================

export interface WorkflowInput {
  reportId: string;
  inputData: InputData[];
  config: ReportConfig;
}

export interface WorkflowResult {
  reportId: string;
  status: ReportStatus;
  files: ReportFile[];
  error?: string;
}

// ============================================================================
// AI Generation Types
// ============================================================================

export interface InsightGenerationInput {
  dataProfile: DataProfile;
  rawData: Record<string, unknown>[];
  style: ReportStyle;
  title: string;
  customInstructions?: string;
}

export interface GeneratedInsight {
  sectionId: string;
  sectionTitle: string;
  content: string;
  order: number;
}

export interface GeneratedNarrative {
  executiveSummary: string;
  sections: GeneratedInsight[];
  recommendations: string[];
  keyFindings: string[];
}

// Re-export for convenience - these are already exported from common.types.ts

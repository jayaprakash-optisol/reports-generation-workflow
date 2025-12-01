import { z } from 'zod';

// ============================================================================
// Report Styles & Formats
// ============================================================================

export const ReportStyleSchema = z.enum(['business', 'research', 'technical']);
export type ReportStyle = z.infer<typeof ReportStyleSchema>;

export const OutputFormatSchema = z.enum(['PDF', 'DOCX', 'HTML']);
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

// ============================================================================
// Report Status
// ============================================================================

export const ReportStatusSchema = z.enum([
  'QUEUED',
  'DATA_PROFILING',
  'INSIGHT_GENERATION',
  'CHART_GENERATION',
  'LAYOUT_RENDERING',
  'EXPORTING',
  'COMPLETED',
  'FAILED',
]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

// ============================================================================
// Data Types
// ============================================================================

export const ColumnTypeSchema = z.enum(['numeric', 'categorical', 'datetime', 'text', 'boolean', 'unknown']);
export type ColumnType = z.infer<typeof ColumnTypeSchema>;

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  nullCount: number;
  uniqueCount: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  median?: number;
  stdDev?: number;
  topValues?: Array<{ value: string; count: number }>;
}

export interface DataProfile {
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  dataQualityScore: number;
  suggestedCharts: ChartSuggestion[];
}

// ============================================================================
// Chart Types
// ============================================================================

export const ChartTypeSchema = z.enum(['line', 'bar', 'stacked_bar', 'pie', 'donut', 'table', 'area']);
export type ChartType = z.infer<typeof ChartTypeSchema>;

export interface ChartSuggestion {
  type: ChartType;
  title: string;
  xAxis?: string;
  yAxis?: string | string[];
  reason: string;
}

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  data: ChartData;
  options?: ChartOptions;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }>;
}

export interface ChartOptions {
  width?: number;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export interface GeneratedChart {
  id: string;
  config: ChartConfig;
  imagePath: string;
  imageBase64?: string;
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

export interface TableData {
  headers: string[];
  rows: string[][];
  caption?: string;
}

// ============================================================================
// Report Configuration
// ============================================================================

export const BrandingSchema = z.object({
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().default('#1a365d'),
  secondaryColor: z.string().default('#2b6cb0'),
  accentColor: z.string().default('#ed8936'),
  fontFamily: z.string().default('Inter, system-ui, sans-serif'),
  companyName: z.string().optional(),
});
export type Branding = z.infer<typeof BrandingSchema>;

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
  format: z.enum(['json', 'csv']),
  data: z.union([z.string(), z.array(z.record(z.unknown()))]),
  schemaHints: z.record(ColumnTypeSchema).optional(),
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


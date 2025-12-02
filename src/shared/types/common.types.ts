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

export const ColumnTypeSchema = z.enum([
  'numeric',
  'categorical',
  'datetime',
  'text',
  'boolean',
  'unknown',
]);
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

// ============================================================================
// Branding Configuration
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

// ============================================================================
// Table Data
// ============================================================================

export interface TableData {
  headers: string[];
  rows: string[][];
  caption?: string;
}

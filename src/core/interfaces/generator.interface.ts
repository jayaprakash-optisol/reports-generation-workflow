import type {
  Branding,
  ChartSuggestion,
  DataProfile,
  GeneratedChart,
  GeneratedNarrative,
  Report,
  TableData,
} from '../../shared/types/index.js';

/**
 * Chart Generator Interface
 */
export interface IChartGenerator {
  generateCharts(
    suggestions: ChartSuggestion[],
    parsedData: Record<string, unknown>[],
    reportId: string,
    dataProfile: DataProfile
  ): Promise<GeneratedChart[]>;

  generateSummaryTable(profile: DataProfile): { headers: string[]; rows: string[][] };
}

/**
 * HTML Generator Interface
 */
export interface IHTMLGenerator {
  generateReport(
    report: Report,
    narrative: GeneratedNarrative,
    charts: GeneratedChart[],
    dataProfile: DataProfile,
    branding?: Branding
  ): string;

  generateTable(tableData: TableData): string;
}

/**
 * PDF Generator Interface
 */
export interface IPDFGenerator {
  initialize(): Promise<void>;
  close(): Promise<void>;

  generateFromHTML(
    html: string,
    reportId: string,
    filename: string
  ): Promise<{ path: string; size: number }>;

  generateWithOptions(
    html: string,
    reportId: string,
    filename: string,
    options?: {
      landscape?: boolean;
      pageSize?: 'A4' | 'Letter' | 'Legal';
      scale?: number;
    }
  ): Promise<{ path: string; size: number }>;

  generatePreview(
    html: string,
    reportId: string,
    filename: string
  ): Promise<{ path: string; size: number }>;
}

/**
 * DOCX Generator Interface
 */
export interface IDOCXGenerator {
  generateReport(
    report: Report,
    narrative: GeneratedNarrative,
    charts: GeneratedChart[],
    dataProfile: DataProfile,
    branding?: Branding
  ): Promise<{ path: string; size: number }>;
}

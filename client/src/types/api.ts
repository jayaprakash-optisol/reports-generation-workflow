// Report Request Types
export interface ReportData {
  type: 'structured' | 'unstructured';
  format: 'json' | 'csv' | 'text' | 'markdown';
  data?: any;
  content?: string;
}

export interface ReportConfig {
  title: string;
  style: 'business' | 'research' | 'technical';
  outputFormats: ('PDF' | 'DOCX' | 'HTML')[];
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    companyName?: string;
  };
  sectionsToInclude?: string[];
  sectionsToExclude?: string[];
  authorName?: string;
  customPromptInstructions?: string;
}

export interface ReportRequest {
  data: ReportData[];
  config: ReportConfig;
}

// Report Response Types
export interface ReportResponse {
  reportId: string;
  workflowId: string;
  status:
    | 'QUEUED'
    | 'DATA_PROFILING'
    | 'INSIGHT_GENERATION'
    | 'CHART_GENERATION'
    | 'LAYOUT_RENDERING'
    | 'EXPORTING'
    | 'COMPLETED'
    | 'FAILED';
  statusUrl: string;
}

export interface ReportFile {
  format: 'PDF' | 'DOCX' | 'HTML';
  url: string;
  size: number;
}

export interface ReportStatus {
  id: string;
  title: string;
  style: 'business' | 'research' | 'technical';
  status:
    | 'QUEUED'
    | 'DATA_PROFILING'
    | 'INSIGHT_GENERATION'
    | 'CHART_GENERATION'
    | 'LAYOUT_RENDERING'
    | 'EXPORTING'
    | 'COMPLETED'
    | 'FAILED';
  progress: number;
  workflowId: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  files?: ReportFile[];
  error?: string;
}

export interface ReportListItem {
  id: string;
  title: string;
  style: 'business' | 'research' | 'technical';
  status:
    | 'QUEUED'
    | 'DATA_PROFILING'
    | 'INSIGHT_GENERATION'
    | 'CHART_GENERATION'
    | 'LAYOUT_RENDERING'
    | 'EXPORTING'
    | 'COMPLETED'
    | 'FAILED';
  progress?: number;
  createdAt: string;
  completedAt?: string;
}

export interface ReportListResponse {
  reports: ReportListItem[];
  total: number;
}

// Cost Types
export interface ReportCosts {
  reportId: string;
  totalCost: number;
  totalTokens: number;
  breakdown: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  }[];
}

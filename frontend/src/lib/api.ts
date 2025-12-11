export type ReportFile = {
  format: string;
  url: string;
  size?: number;
};

export type ReportStatusResponse = {
  id?: string;
  status: string;
  progress?: number;
  currentStep?: string;
  files?: ReportFile[];
  error?: string;
  title?: string;
  style?: string;
};

export type StartWorkflowResponse = {
  reportId: string;
  workflowId: string;
  status?: string;
};

// Use empty string to use the same origin (works with Vite proxy)
// Or set VITE_API_BASE environment variable for production
const API_BASE = import.meta.env.VITE_API_BASE || '';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function createReportFromJson(payload: unknown): Promise<StartWorkflowResponse> {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function startReportUpload(formData: FormData): Promise<StartWorkflowResponse> {
  const res = await fetch(`${API_BASE}/api/reports/upload`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res);
}

export async function fetchReportStatus(reportId: string): Promise<ReportStatusResponse | null> {
  const res = await fetch(`${API_BASE}/api/reports/${reportId}`);
  if (!res.ok) return null;
  return res.json();
}

export type ReportListItem = {
  id: string;
  title?: string;
  style?: string;
  status: string;
  progress?: number;
  currentStep?: string;
  files?: ReportFile[];
  error?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
};

export type ListReportsResponse = {
  count: number;
  reports: ReportListItem[];
};

export async function listReports(): Promise<ListReportsResponse> {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch reports: ${res.status} ${text}`);
  }

  const data = await res.json();

  // Ensure the response has the expected structure
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response format from API');
  }

  return {
    count: data.count ?? (Array.isArray(data.reports) ? data.reports.length : 0),
    reports: Array.isArray(data.reports) ? data.reports : [],
  };
}

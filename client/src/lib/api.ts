import {
  ReportCosts,
  ReportListResponse,
  ReportRequest,
  ReportResponse,
  ReportStatus,
} from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(
      errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      errorData
    );
  }
  return response.json();
}

export const api = {
  // Health check endpoints
  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<{ status: string; timestamp: string }>(response);
  },

  async healthCheckDetailed() {
    const response = await fetch(`${API_BASE_URL}/health/detailed`);
    return handleResponse<{
      status: string;
      timestamp: string;
      services: {
        temporal: { status: string };
        storage: { status: string };
      };
    }>(response);
  },

  // Report creation
  async createReport(data: ReportRequest) {
    const response = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<ReportResponse>(response);
  },

  // Report upload (multipart/form-data)
  async uploadReport(formData: FormData) {
    const response = await fetch(`${API_BASE_URL}/reports/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<ReportResponse>(response);
  },

  // Get report status
  async getReportStatus(reportId: string) {
    const response = await fetch(`${API_BASE_URL}/reports/${reportId}`);
    return handleResponse<ReportStatus>(response);
  },

  // List all reports
  async listReports() {
    const response = await fetch(`${API_BASE_URL}/reports`);
    return handleResponse<ReportListResponse>(response);
  },

  // Download report file
  async downloadReport(reportId: string, format: 'PDF' | 'DOCX' | 'HTML') {
    const response = await fetch(`${API_BASE_URL}/reports/${reportId}/files?format=${format}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }
    return response.blob();
  },

  // Cancel report generation
  async cancelReport(reportId: string) {
    const response = await fetch(`${API_BASE_URL}/reports/${reportId}/cancel`, {
      method: 'POST',
    });
    return handleResponse<{ message: string; reportId: string }>(response);
  },

  // Wait for report completion (blocking)
  async waitForReport(reportId: string) {
    const response = await fetch(`${API_BASE_URL}/reports/${reportId}/wait`);
    return handleResponse<ReportStatus>(response);
  },

  // Batch report creation
  async createBatchReports(requests: ReportRequest[]) {
    const response = await fetch(`${API_BASE_URL}/reports/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
    return handleResponse<{ reports: ReportResponse[] }>(response);
  },

  // Get report costs
  async getReportCosts(reportId: string) {
    const response = await fetch(`${API_BASE_URL}/reports/${reportId}/costs`);
    return handleResponse<ReportCosts>(response);
  },

  // Get aggregated costs
  async getAggregatedCosts() {
    const response = await fetch(`${API_BASE_URL}/reports/costs/aggregated`);
    return handleResponse<{
      totalCost: number;
      totalTokens: number;
      reportCount: number;
      averageCostPerReport: number;
    }>(response);
  },
};

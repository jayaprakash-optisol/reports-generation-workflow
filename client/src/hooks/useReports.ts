import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ReportRequest } from '@/types/api';
import { toast } from 'sonner';

// Query keys
export const reportKeys = {
  all: ['reports'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
  list: () => [...reportKeys.lists()] as const,
  details: () => [...reportKeys.all, 'detail'] as const,
  detail: (id: string) => [...reportKeys.details(), id] as const,
  costs: (id: string) => [...reportKeys.all, 'costs', id] as const,
  aggregatedCosts: () => [...reportKeys.all, 'costs', 'aggregated'] as const,
};

// List all reports
export function useReports() {
  return useQuery({
    queryKey: reportKeys.list(),
    queryFn: api.listReports,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    retry: 1, // Only retry once on failure
    retryDelay: 1000,
    // Don't throw errors, return empty state instead
    placeholderData: { reports: [], total: 0 },
  });
}

// Get single report status
export function useReportStatus(reportId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: reportKeys.detail(reportId || ''),
    queryFn: () => api.getReportStatus(reportId!),
    enabled: enabled && !!reportId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll more frequently if report is in progress
      if (data?.status && !['COMPLETED', 'FAILED'].includes(data.status)) {
        return 2000; // 2 seconds
      }
      return false; // Stop polling when completed or failed
    },
  });
}

// Get report costs
export function useReportCosts(reportId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: reportKeys.costs(reportId || ''),
    queryFn: () => api.getReportCosts(reportId!),
    enabled: enabled && !!reportId,
  });
}

// Get aggregated costs
export function useAggregatedCosts() {
  return useQuery({
    queryKey: reportKeys.aggregatedCosts(),
    queryFn: api.getAggregatedCosts,
  });
}

// Create report mutation
export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReportRequest) => api.createReport(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      toast.success('Report generation started!', {
        description: `Report ID: ${data.reportId}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create report', {
        description: error.message,
      });
    },
  });
}

// Upload report mutation
export function useUploadReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => api.uploadReport(formData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      toast.success('Report generation started!', {
        description: `Report ID: ${data.reportId}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to upload report', {
        description: error.message,
      });
    },
  });
}

// Cancel report mutation
export function useCancelReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => api.cancelReport(reportId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.detail(data.reportId) });
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      toast.success('Report cancelled', {
        description: `Report ID: ${data.reportId}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to cancel report', {
        description: error.message,
      });
    },
  });
}

// Download report
export async function downloadReport(reportId: string, format: 'PDF' | 'DOCX' | 'HTML', title: string) {
  try {
    const blob = await api.downloadReport(reportId, format);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.${format.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Download started', {
      description: `Downloading ${format} file`,
    });
  } catch (error) {
    toast.error('Download failed', {
      description: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Health check
export function useHealthCheck() {
  return useQuery({
    queryKey: ['health', 'detailed'],
    queryFn: api.healthCheckDetailed,
    refetchInterval: 30000, // Check every 30 seconds
    retry: 2,
    retryDelay: 1000,
  });
}

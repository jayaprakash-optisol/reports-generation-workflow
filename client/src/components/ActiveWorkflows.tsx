import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { reportKeys, useActiveWorkflows, useReportStatus } from '@/hooks/useReports';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ActiveWorkflowItemProps {
  readonly report: {
    readonly id: string;
    readonly title: string;
    readonly status: string;
    readonly progress?: number;
  };
}

function ActiveWorkflowItem({ report }: ActiveWorkflowItemProps) {
  const queryClient = useQueryClient();
  // Only fetch status if we have a valid report ID
  const hasValidId = !!report.id && report.id.trim() !== '';
  const {
    data: reportStatus,
    isLoading,
    isFetching,
  } = useReportStatus(hasValidId ? report.id : undefined, hasValidId);
  const previousStatusRef = useRef<string | undefined>(report.status);

  // Use detailed status data when available, fallback to list data (which now includes live Temporal status)
  const displayId = reportStatus?.id || report.id;
  const displayTitle = reportStatus?.title || report.title || 'Untitled Report';
  const status = reportStatus?.status || report.status;
  // Use progress from individual status query if available, otherwise use progress from list (Temporal)
  const progress = reportStatus?.progress ?? report.progress ?? 0;
  const isProcessing = status && !['COMPLETED', 'FAILED'].includes(status);

  const showSpinner = isLoading || isProcessing || isFetching;

  // Invalidate active workflows and reports list when status changes (e.g., from processing to completed)
  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    if (previousStatus && previousStatus !== status) {
      // Status changed - invalidate both active workflows and reports list
      queryClient.invalidateQueries({ queryKey: reportKeys.activeWorkflows() });
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
    }
    previousStatusRef.current = status;
  }, [status, queryClient]);

  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground text-sm truncate">{displayTitle}</h4>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            ID: {displayId || 'Loading...'}
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-xs border-yellow-500/50 text-yellow-500 bg-yellow-500/10 shrink-0"
        >
          {showSpinner && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          {status}
        </Badge>
      </div>
      {isProcessing && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-xs font-medium text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
    </div>
  );
}

export function ActiveWorkflows() {
  const { data, isLoading } = useActiveWorkflows();

  const activeReports = (() => {
    const reports = data?.reports || [];
    return [...reports].sort((a, b) => {
      // Sort by most recent first (descending order by createdAt)
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  })();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Loading workflows...</p>
        </div>
      );
    }

    if (activeReports.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 rounded-full bg-muted/50 mb-3 animate-float">
            <Activity className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No active workflows. Start a report to see status.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {activeReports.map((report, index) => (
          <ActiveWorkflowItem
            key={report.id || `workflow-${index}-${report.createdAt || Date.now()}`}
            report={report}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Active workflows</h2>
        <p className="text-sm text-muted-foreground">Live progress with heartbeats and retries.</p>
      </div>
      {renderContent()}
    </div>
  );
}

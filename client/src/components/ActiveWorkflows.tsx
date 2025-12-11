import { Activity, Loader2 } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function ActiveWorkflows() {
  const { data, isLoading } = useReports();
  
  const activeReports = data?.reports.filter(
    report => report.status && !['COMPLETED', 'FAILED'].includes(report.status)
  ) || [];

  return (
    <div className="glass-card p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Active workflows</h2>
        <p className="text-sm text-muted-foreground">Live progress with heartbeats and retries.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Loading workflows...</p>
        </div>
      ) : activeReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 rounded-full bg-muted/50 mb-3 animate-float">
            <Activity className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No active workflows. Start a report to see status.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeReports.map((report) => (
            <div
              key={report.id}
              className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground text-sm">{report.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ID: {report.id}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs border-yellow-500/50 text-yellow-500 bg-yellow-500/10"
                >
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  {report.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { downloadReport, useCancelReport, useReportStatus } from '@/hooks/useReports';
import { FileDown, Loader2, XCircle } from 'lucide-react';

interface ReportItemProps {
  title: string;
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED';
  type: string;
  date: string;
  id: string;
  downloads: { format: string; size: string }[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function ReportItem({
  title,
  status: initialStatus,
  type,
  date,
  id,
  downloads: initialDownloads,
}: ReportItemProps) {
  const { data: reportStatus } = useReportStatus(id, true);
  const cancelMutation = useCancelReport();

  const status = reportStatus?.status || initialStatus;
  const files = reportStatus?.files || [];
  const progress = reportStatus?.progress || 0;
  const isProcessing = status && !['COMPLETED', 'FAILED'].includes(status);

  const handleDownload = (format: 'PDF' | 'DOCX' | 'HTML') => {
    downloadReport(id, format, title);
  };

  const handleCancel = () => {
    cancelMutation.mutate(id);
  };

  return (
    <div className="p-4 rounded-lg bg-muted/30 border border-border/30 hover:border-border/50 hover:bg-muted/40 transition-all duration-200 space-y-3 hover:translate-x-1">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h4 className="font-medium text-foreground text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {date} • ID: {id}
          </p>
          {isProcessing && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{progress}%</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Badge
            variant="outline"
            className={`text-xs ${
              status === 'COMPLETED'
                ? 'border-success/50 text-success bg-success/10'
                : status === 'FAILED'
                  ? 'border-destructive/50 text-destructive bg-destructive/10'
                  : 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10'
            }`}
          >
            {isProcessing && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {status === 'FAILED' && <XCircle className="w-3 h-3 mr-1" />}
            {status}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {type}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {status === 'COMPLETED' && files.length > 0 ? (
          files.map(file => (
            <Button
              key={file.format}
              variant="outline"
              size="sm"
              onClick={() => handleDownload(file.format)}
              className="text-xs h-8 border-border/50 hover:bg-muted/50 hover:border-primary/30 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <FileDown className="w-3 h-3 mr-1.5" />
              {file.format} ({formatBytes(file.size)})
            </Button>
          ))
        ) : isProcessing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
            className="text-xs h-8 border-border/50 hover:bg-destructive/10 hover:border-destructive/30 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <XCircle className="w-3 h-3 mr-1.5" />
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

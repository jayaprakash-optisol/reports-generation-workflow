import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useHealthCheck } from '@/hooks/useReports';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ConnectionStatus() {
  const { data, isLoading, isError } = useHealthCheck();

  if (isLoading) {
    return (
      <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
        <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
        <AlertDescription className="text-yellow-500">
          Connecting to API server...
        </AlertDescription>
      </Alert>
    );
  }

  if (isError || !data) {
    return (
      <Alert className="mb-4 border-destructive/50 bg-destructive/10">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-destructive">
          Cannot connect to API server at <code className="text-xs">http://localhost:3000</code>. 
          Please start the backend server.
        </AlertDescription>
      </Alert>
    );
  }

  if (data.status === 'healthy') {
    return (
      <Alert className="mb-4 border-success/50 bg-success/10">
        <CheckCircle className="h-4 w-4 text-success" />
        <AlertDescription className="text-success">
          Connected to API server • Temporal: {data.services?.temporal?.status || 'unknown'} • Storage: {data.services?.storage?.status || 'unknown'}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

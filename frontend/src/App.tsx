import { Download, FilePlus, Loader2, RefreshCcw, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Progress } from './components/ui/progress';
import { Textarea } from './components/ui/textarea';

type OutputFormat = 'PDF' | 'DOCX' | 'HTML';

type ReportFile = {
  format: OutputFormat;
  url: string;
  size?: number;
  generatedAt?: string;
};

type ReportStatusResponse = {
  id: string;
  title: string;
  style: string;
  status: string;
  progress?: number;
  currentStep?: string;
  files?: ReportFile[];
};

type ReportListItem = {
  id: string;
  title?: string;
  status?: string;
  outputFormats?: OutputFormat[];
  updatedAt?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

const defaultData = `[
  {
    "type": "structured",
    "format": "json",
    "data": [
      { "month": "January", "revenue": 45000, "customers": 120 },
      { "month": "February", "revenue": 52000, "customers": 145 },
      { "month": "March", "revenue": 48000, "customers": 132 }
    ]
  }
]`;

function App() {
  const [title, setTitle] = useState('Q1 Business Report');
  const [style, setStyle] = useState<'business' | 'research' | 'technical'>('business');
  const [outputFormats, setOutputFormats] = useState<OutputFormat[]>(['PDF', 'HTML']);
  const [dataInput, setDataInput] = useState(defaultData);
  const [customInstructions, setCustomInstructions] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ReportStatusResponse | null>(null);
  const [recentReports, setRecentReports] = useState<ReportListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reportIdInput, setReportIdInput] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiBase = useMemo(() => API_BASE.replace(/\/$/, ''), []);

  const handleToggleFormat = (format: OutputFormat) => {
    setOutputFormats(prev =>
      prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]
    );
  };

  const createReport = async () => {
    try {
      setLoadingAction('create');
      setError(null);

      const parsed = JSON.parse(dataInput);

      const response = await fetch(`${apiBase}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: parsed,
          config: {
            title,
            style,
            outputFormats,
            customPromptInstructions: customInstructions || undefined,
          },
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || 'Failed to start workflow');
      }

      const result = (await response.json()) as { reportId: string; statusUrl: string };
      setReportIdInput(result.reportId);
      await fetchStatus(result.reportId);
      await fetchRecentReports();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingAction(null);
    }
  };

  const uploadReport = async () => {
    if (!uploadFile) {
      setError('Please select a file to upload.');
      return;
    }

    try {
      setLoadingAction('upload');
      setError(null);
      const formData = new FormData();
      formData.append('files', uploadFile);
      formData.append('title', title);
      formData.append('style', style);
      formData.append('outputFormats', outputFormats.join(','));
      if (customInstructions) formData.append('customInstructions', customInstructions);

      const response = await fetch(`${apiBase}/api/reports/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || 'Upload failed');
      }

      const result = (await response.json()) as { reportId: string; statusUrl: string };
      setReportIdInput(result.reportId);
      await fetchStatus(result.reportId);
      await fetchRecentReports();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingAction(null);
    }
  };

  const fetchStatus = async (id: string) => {
    if (!id) return;
    try {
      setLoadingAction('status');
      setError(null);
      const response = await fetch(`${apiBase}/api/reports/${id}`);
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || 'Unable to fetch status');
      }
      const data = (await response.json()) as ReportStatusResponse;
      setStatus(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingAction(null);
    }
  };

  const fetchRecentReports = async () => {
    try {
      const response = await fetch(`${apiBase}/api/reports`);
      if (!response.ok) return;
      const raw = await response.json();
      const itemsFromResponse: ReportListItem[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.reports)
          ? raw.reports
          : [];

      const normalized = itemsFromResponse
        .map(r => ({
          id: r.id,
          title: r.title,
          status: (r as any).status ?? r.status,
          outputFormats: (r as any).outputFormats ?? r.outputFormats,
          updatedAt: (r as any).updatedAt ?? r.updatedAt ?? (r as any).completedAt,
        }))
        .filter(r => Boolean(r.id));

      // Sort by updatedAt desc if available, otherwise leave as-is
      const sorted = [...normalized].sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      });

      setRecentReports(sorted);
      setPage(1);
    } catch {
      // fail silently
    }
  };

  useEffect(() => {
    void fetchRecentReports();
  }, []);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '—';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  };

  const downloadUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    const normalized = path.startsWith('/reports/')
      ? `/api${path}` // migrate old stored URLs
      : path;
    return `${apiBase}${normalized}`;
  };

  const totalPages = Math.max(1, Math.ceil(recentReports.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedReports = recentReports.slice(
    (currentPage - 1) * pageSize,
    (currentPage - 1) * pageSize + pageSize
  );

  const appTitle = 'Report Orchestrator';
  const appSubtitle = 'Generate, track, and export AI-powered reports with Temporal.';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-primary">AI-Powered Report Generation</p>
            <h1 className="text-3xl font-semibold tracking-tight">{appTitle}</h1>
            <p className="text-sm text-muted-foreground">{appSubtitle}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>Create a report</CardTitle>
              <CardDescription>
                Upload data or paste JSON. We orchestrate profiling, insights, charts, and exports
                with Temporal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Quarterly Business Review"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="style">Style</Label>
                  <div className="flex gap-2">
                    {(['business', 'research', 'technical'] as const).map(s => (
                      <Button
                        key={s}
                        type="button"
                        variant={style === s ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStyle(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Output formats</Label>
                <div className="flex flex-wrap gap-2">
                  {(['PDF', 'DOCX', 'HTML'] as OutputFormat[]).map(f => (
                    <Button
                      key={f}
                      type="button"
                      variant={outputFormats.includes(f) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleToggleFormat(f)}
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customInstructions">Custom instructions (optional)</Label>
                <Input
                  id="customInstructions"
                  value={customInstructions}
                  onChange={e => setCustomInstructions(e.target.value)}
                  placeholder="Emphasize North America performance and risks."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data">Data (JSON)</Label>
                <Textarea
                  id="data"
                  value={dataInput}
                  onChange={e => setDataInput(e.target.value)}
                  className="min-h-[200px] font-mono"
                  placeholder="Paste structured/unstructured data JSON"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={createReport} disabled={loadingAction === 'create'}>
                  {loadingAction === 'create' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting workflow...
                    </>
                  ) : (
                    <>
                      <FilePlus className="mr-2 h-4 w-4" /> Create report
                    </>
                  )}
                </Button>

                <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
                  <Input
                    type="file"
                    accept=".json,.csv,.tsv,.txt,.md,.xlsx,.xls"
                    onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={uploadReport}
                    disabled={loadingAction === 'upload'}
                  >
                    {loadingAction === 'upload' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" /> Upload & start
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Workflow status</CardTitle>
              <CardDescription>
                Track Temporal progress, retries, and final outputs for a report.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reportId">Report ID</Label>
                <Input
                  id="reportId"
                  value={reportIdInput}
                  onChange={e => setReportIdInput(e.target.value)}
                  placeholder="abc123..."
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fetchStatus(reportIdInput)}
                    disabled={!reportIdInput || loadingAction === 'status'}
                  >
                    {loadingAction === 'status' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCcw className="mr-2 h-4 w-4" /> Refresh status
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {status ? (
                <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Report</p>
                      <p className="font-semibold">{status.title}</p>
                      <p className="text-xs text-muted-foreground">Style: {status.style}</p>
                    </div>
                    <Badge variant="secondary">{status.status}</Badge>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{status.currentStep ?? 'In progress'}</span>
                      <span>{status.progress ?? 0}%</span>
                    </div>
                    <Progress value={status.progress ?? 0} className="mt-2" />
                  </div>

                  {status.files && status.files.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs uppercase text-muted-foreground">Files</p>
                      <div className="space-y-2">
                        {status.files.map(file => (
                          <div
                            key={file.format}
                            className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                          >
                            <div>
                              <p className="font-medium">{file.format}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatBytes(file.size)} • {formatDate(file.generatedAt)}
                              </p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a href={downloadUrl(file.url)} target="_blank" rel="noreferrer">
                                <Download className="mr-2 h-4 w-4" /> Download
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No files yet.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Enter a report ID to see progress.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Recent reports</CardTitle>
              <CardDescription>All reports from the API with pagination.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Page size</Label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[5, 10, 20, 50].map(size => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="outline" size="sm" onClick={() => fetchRecentReports()}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Refresh list
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              {recentReports.length === 0 && (
                <p className="text-sm text-muted-foreground">No reports yet.</p>
              )}
              {paginatedReports.map(report => (
                <div
                  key={report.id}
                  className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{report.title ?? 'Untitled report'}</p>
                      <Badge variant="secondary">{report.status ?? 'UNKNOWN'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground break-all">ID: {report.id}</p>
                    <p className="text-xs text-muted-foreground">
                      Formats: {report.outputFormats?.join(', ') ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updated: {formatDate(report.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReportIdInput(report.id);
                        void fetchStatus(report.id);
                      }}
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" /> View status
                    </Button>
                    <div className="flex gap-1">
                      {(report.outputFormats ?? []).map(format => (
                        <Badge key={format} variant="outline">
                          {format}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 border-t pt-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
              <div>
                Showing {(currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, recentReports.length)} of {recentReports.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <span>
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default App;

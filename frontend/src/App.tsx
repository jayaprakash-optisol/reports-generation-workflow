import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { Alert } from './components/ui/alert';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Progress } from './components/ui/progress';
import { Textarea } from './components/ui/textarea';
import type { ReportFile, ReportListItem } from './lib/api';
import { createReportFromJson, fetchReportStatus, listReports, startReportUpload } from './lib/api';
import { cn } from './lib/utils';

interface ReportStatus {
  reportId: string;
  workflowId: string;
  status: string;
  progress?: number;
  currentStep?: string;
  files?: ReportFile[];
  error?: string;
  title?: string;
  style?: string;
  createdAt: string;
}

const sampleData = `[
  { "month": "January", "revenue": 45000, "customers": 120 },
  { "month": "February", "revenue": 52000, "customers": 145 },
  { "month": "March", "revenue": 48000, "customers": 132 }
]`;

const styles = ['business', 'research', 'technical'] as const;
const formats = ['PDF', 'DOCX', 'HTML'] as const;

function App() {
  const [title, setTitle] = useState('Q1 Performance Report');
  const [style, setStyle] = useState<(typeof styles)[number]>('business');
  const [outputFormats, setOutputFormats] = useState<Array<(typeof formats)[number]>>([
    'PDF',
    'HTML',
  ]);
  const [instructions, setInstructions] = useState(
    'Keep it concise, data-driven, and executive-friendly.'
  );
  const [textData, setTextData] = useState(sampleData);
  const [files, setFiles] = useState<File[]>([]);
  const [activeReports, setActiveReports] = useState<ReportStatus[]>([]);
  const [allReports, setAllReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE || '', []);

  const buildFileUrl = (fileUrl: string) => {
    if (fileUrl.startsWith('http')) return fileUrl;
    const prefix = apiBase || '';
    const normalized = fileUrl.startsWith('/api') ? fileUrl : `/api${fileUrl}`;
    return `${prefix}${normalized}`;
  };

  useEffect(() => {
    loadAllReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      activeReports
        .filter(r => !['COMPLETED', 'FAILED', 'CANCELLED'].includes(r.status))
        .forEach(r => refreshStatus(r.reportId));
    }, 4000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReports]);

  const loadAllReports = async () => {
    setLoadingReports(true);
    setError(null);
    try {
      const response = await listReports();
      console.log('📊 API Response:', response);

      if (!response || !Array.isArray(response.reports)) {
        console.error('❌ Invalid response format');
        setAllReports([]);
        return;
      }

      if (response.reports.length === 0) {
        console.log('ℹ️ No reports in response');
        setAllReports([]);
        return;
      }

      // Map and sort reports
      const sorted = response.reports
        .map(report => ({
          id: report.id || '',
          title: report.title,
          style: report.style,
          status: report.status || 'UNKNOWN',
          progress: report.progress,
          currentStep: report.currentStep,
          files: report.files,
          error: report.error,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
          completedAt: report.completedAt,
        }))
        .filter(report => report.id)
        .sort((a, b) => {
          const dateA = a.updatedAt || a.createdAt || '';
          const dateB = b.updatedAt || b.createdAt || '';
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

      console.log('✅ Processed reports:', sorted.length, 'reports');
      console.log('Reports:', sorted);
      setAllReports(sorted);
    } catch (err) {
      console.error('❌ Error loading reports:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to load reports';
      setError(errorMsg);
      setAllReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const toggleFormat = (fmt: (typeof formats)[number]) => {
    setOutputFormats(prev => (prev.includes(fmt) ? prev.filter(f => f !== fmt) : [...prev, fmt]));
  };

  const handleFiles = (evt: ChangeEvent<HTMLInputElement>) => {
    const next = Array.from(evt.target.files ?? []);
    setFiles(next);
  };

  const parseStructuredData = () => {
    if (!textData.trim()) return [];
    try {
      const parsed = JSON.parse(textData);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [{ text: textData }];
    }
  };

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    setError(null);
    setSuccess(null);

    if (outputFormats.length === 0) {
      setError('Select at least one output format (PDF, DOCX, or HTML).');
      return;
    }

    setLoading(true);
    try {
      const baseConfig = {
        title: title || 'Untitled report',
        style,
        outputFormats,
        customPromptInstructions: instructions || undefined,
      };

      let reportId: string;
      let workflowId: string;

      if (files.length > 0) {
        const form = new FormData();
        files.forEach(file => form.append('files', file));
        form.append('title', baseConfig.title);
        form.append('style', baseConfig.style);
        form.append('outputFormats', baseConfig.outputFormats.join(','));
        if (baseConfig.customPromptInstructions)
          form.append('customPromptInstructions', baseConfig.customPromptInstructions);
        if (textData.trim()) form.append('textContent', textData.trim());

        const res = await startReportUpload(form);
        reportId = res.reportId;
        workflowId = res.workflowId;
      } else {
        const payload = {
          data: [
            {
              type: 'structured',
              format: 'json',
              data: parseStructuredData(),
            },
          ],
          config: baseConfig,
        };
        const res = await createReportFromJson(payload);
        reportId = res.reportId;
        workflowId = res.workflowId;
      }

      const newEntry: ReportStatus = {
        reportId,
        workflowId,
        status: 'QUEUED',
        progress: 0,
        currentStep: 'Queued',
        createdAt: new Date().toISOString(),
      };
      setActiveReports(prev => [newEntry, ...prev]);
      setSuccess(`Report queued. Workflow: ${workflowId}`);
      refreshStatus(reportId);
      // Reload all reports to include the new one
      setTimeout(() => loadAllReports(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start report.');
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async (reportId: string) => {
    try {
      const status = await fetchReportStatus(reportId);
      if (!status) return;
      setActiveReports(prev =>
        prev.map(r =>
          r.reportId === reportId
            ? {
                ...r,
                status: status.status ?? r.status,
                progress: status.progress ?? r.progress,
                currentStep: status.currentStep ?? r.currentStep,
                files: status.files ?? r.files,
                error: status.error ?? r.error,
                title: status.title ?? r.title,
                style: status.style ?? r.style,
              }
            : r
        )
      );

      // If status changed to completed/failed, refresh all reports list
      const updatedReport = activeReports.find(r => r.reportId === reportId);
      if (updatedReport && ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status.status)) {
        // Small delay to ensure backend has updated
        setTimeout(() => loadAllReports(), 500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch status.');
    }
  };

  const terminalReports = activeReports.filter(r =>
    ['COMPLETED', 'FAILED', 'CANCELLED'].includes(r.status)
  );

  // Paginate all reports (already sorted by loadAllReports, but re-sort to be safe)
  const sortedAllReports = [...allReports].sort((a, b) => {
    const dateA = a.updatedAt || a.createdAt || '';
    const dateB = b.updatedAt || b.createdAt || '';
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  const totalPages = Math.max(1, Math.ceil(sortedAllReports.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = sortedAllReports.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-930 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="text-xs" variant="primary">
                Temporal + OpenAI
              </Badge>
              <Badge variant="secondary">Durable workflows</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-bold text-white">AI Report Generator</h1>
            <p className="text-slate-400">
              Upload data or JSON, kick off a Temporal workflow, and track progress with retries,
              heartbeats, and idempotent exports.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              API docs:{' '}
              <a
                className="text-indigo-300 hover:text-indigo-200"
                href={`${apiBase}/api/docs`}
                target="_blank"
                rel="noreferrer"
              >
                /api/docs
              </a>
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="mb-0">
              <CardTitle>LLM + Charts</CardTitle>
              <CardDescription>
                OpenAI narratives, chart suggestions, and multi-format outputs.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="mb-0">
              <CardTitle>Temporal durability</CardTitle>
              <CardDescription>
                Heartbeats, retries, and cancellation-safe activities.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="mb-0">
              <CardTitle>Idempotent exports</CardTitle>
              <CardDescription>
                Reuse PDF/DOCX/HTML artifacts across retries to avoid duplicate work.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Start a new report</CardTitle>
              <CardDescription>
                Provide a title, choose style and outputs, and send JSON/text or upload files.
              </CardDescription>
            </CardHeader>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Report title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Executive summary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="style">Style</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {styles.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStyle(s)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-sm capitalize transition',
                          style === s
                            ? 'border-indigo-400 bg-indigo-500/10 text-indigo-100'
                            : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-600'
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Output formats</Label>
                <div className="flex flex-wrap gap-2">
                  {formats.map(fmt => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => toggleFormat(fmt)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-sm transition',
                        outputFormats.includes(fmt)
                          ? 'border-indigo-400 bg-indigo-500/10 text-indigo-100'
                          : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-600'
                      )}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Custom instructions</Label>
                <Textarea
                  id="instructions"
                  rows={3}
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder="Tone, structure, or compliance needs for the LLM."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="textData">Inline data (JSON or text)</Label>
                  <Textarea
                    id="textData"
                    rows={10}
                    value={textData}
                    onChange={e => setTextData(e.target.value)}
                    placeholder="Paste JSON or free text. If empty, uploads will be used."
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="files">File uploads</Label>
                  <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/50 p-4">
                    <input
                      id="files"
                      type="file"
                      multiple
                      onChange={handleFiles}
                      className="w-full text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-500/20 file:px-3 file:py-2 file:text-indigo-100 hover:file:bg-indigo-500/30"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      CSV, JSON, text, or markdown. If empty, we send inline JSON/text.
                    </p>
                    {files.length > 0 ? (
                      <p className="mt-2 text-xs text-indigo-200">
                        {files.length} file(s) selected
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {error ? <Alert variant="error">{error}</Alert> : null}
              {success ? <Alert variant="success">{success}</Alert> : null}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" loading={loading}>
                  Generate report
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setFiles([]);
                    setTextData(sampleData);
                    setInstructions('Keep it concise, data-driven, and executive-friendly.');
                    setOutputFormats(['PDF', 'HTML']);
                    setStyle('business');
                  }}
                >
                  Reset form
                </Button>
                <div className="text-xs text-slate-400">
                  Backend: <span className="text-slate-200">{apiBase}</span>
                </div>
              </div>
            </form>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active workflows</CardTitle>
                <CardDescription>Live progress with heartbeats and retries.</CardDescription>
              </CardHeader>
              <div className="space-y-3">
                {activeReports.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No runs yet. Start a report to see status.
                  </p>
                ) : (
                  activeReports.map(report => {
                    const isDone = ['COMPLETED', 'FAILED', 'CANCELLED'].includes(report.status);
                    return (
                      <div
                        key={report.reportId}
                        className="rounded-lg border border-slate-800 bg-slate-900/50 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                              <span className="font-semibold text-white">
                                {report.title ?? 'Report'}
                              </span>
                              <Badge
                                variant={report.status === 'COMPLETED' ? 'success' : 'outline'}
                              >
                                {report.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500">workflow: {report.workflowId}</p>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            step: {report.currentStep ?? '—'}
                          </div>
                        </div>
                        <div className="mt-3">
                          <Progress value={report.progress ?? 0} />
                          <div className="mt-1 text-xs text-slate-400">
                            progress: {Math.round(report.progress ?? 0)}%
                          </div>
                        </div>
                        {report.files && report.files.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {report.files.map(file => (
                              <Button
                                key={file.format}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const url = file.url.startsWith('http')
                                    ? file.url
                                    : `${apiBase}${file.url}`;
                                  window.open(url, '_blank');
                                }}
                              >
                                Download {file.format}
                              </Button>
                            ))}
                          </div>
                        ) : null}
                        {report.error ? (
                          <p className="mt-2 text-xs text-red-300">Error: {report.error}</p>
                        ) : null}
                        {!isDone ? (
                          <div className="mt-2 text-xs text-slate-500">
                            Polling via heartbeats every few seconds.
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Reports</CardTitle>
                    <CardDescription>
                      All reports sorted by most recent ({sortedAllReports.length} total)
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadAllReports}
                    loading={loadingReports}
                  >
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <div className="p-6 pt-0">
                {loadingReports ? (
                  <div className="py-8 text-center text-sm text-slate-400">Loading reports...</div>
                ) : error ? (
                  <Alert variant="error">
                    <div>
                      <p className="font-semibold">Failed to load reports</p>
                      <p className="text-xs mt-1">{error}</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={loadAllReports}>
                        Retry
                      </Button>
                    </div>
                  </Alert>
                ) : sortedAllReports.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-slate-400">No reports found</p>
                    <p className="text-xs text-slate-500 mt-2">
                      Create a new report to see it here
                    </p>
                  </div>
                ) : paginatedReports.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-slate-400">No reports on this page</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setCurrentPage(1)}
                    >
                      Go to first page
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {paginatedReports.map((report, idx) => {
                        const dateStr = report.updatedAt || report.createdAt;
                        const date = dateStr ? new Date(dateStr).toLocaleString() : 'Unknown date';
                        const reportId = report.id || `report-${idx}`;
                        return (
                          <div
                            key={reportId}
                            className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 transition hover:bg-slate-900/60"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-white">
                                    {report.title || reportId}
                                  </span>
                                  <Badge
                                    variant={
                                      report.status === 'COMPLETED'
                                        ? 'success'
                                        : report.status === 'FAILED'
                                          ? 'outline'
                                          : 'primary'
                                    }
                                  >
                                    {report.status}
                                  </Badge>
                                  {report.style && (
                                    <Badge variant="secondary" className="capitalize">
                                      {report.style}
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                  {date} • ID: {reportId}
                                </p>
                              </div>
                            </div>
                            {report.progress !== undefined && report.status !== 'COMPLETED' ? (
                              <div className="mt-2">
                                <Progress value={report.progress} />
                                <p className="mt-1 text-xs text-slate-400">
                                  {report.currentStep || 'Processing...'} (
                                  {Math.round(report.progress)}%)
                                </p>
                              </div>
                            ) : null}
                            {report.files && report.files.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {report.files.map(file => (
                                  <Button
                                    key={file.format}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const url = buildFileUrl(file.url);
                                      window.open(url, '_blank');
                                    }}
                                  >
                                    Download {file.format}
                                    {file.size ? ` (${(file.size / 1024).toFixed(1)} KB)` : ''}
                                  </Button>
                                ))}
                              </div>
                            ) : null}
                            {report.error ? (
                              <p className="mt-2 text-xs text-red-300">Error: {report.error}</p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    {totalPages > 1 && (
                      <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
                        <div className="text-xs text-slate-400">
                          Page {currentPage} of {totalPages} ({sortedAllReports.length} reports)
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

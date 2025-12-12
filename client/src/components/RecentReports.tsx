import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { reportKeys, useReports } from '@/hooks/useReports';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { ReportItem } from './ReportItem';

const ITEMS_PER_PAGE = 3;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function RecentReports() {
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading, isError } = useReports();
  const queryClient = useQueryClient();

  const reports = data?.reports || [];
  const completedReports = reports
    .filter(report => report.status === 'COMPLETED')
    .sort((a, b) => {
      // Sort by most recent first (descending order by createdAt)
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  const totalPages = Math.ceil(completedReports.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedReports = completedReports.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Recent Reports</h2>
          <p className="text-sm text-muted-foreground">
            Completed reports sorted by most recent ({completedReports.length} total)
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground group"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`}
          />
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-destructive">Failed to load reports</p>
          </div>
        ) : completedReports.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">No completed reports yet.</p>
          </div>
        ) : (
          paginatedReports.map((report, index) => {
            const formattedReport = {
              title: report.title || 'Untitled Report',
              status: (report.status || 'QUEUED') as 'COMPLETED' | 'PROCESSING' | 'FAILED',
              type: report.style
                ? report.style.charAt(0).toUpperCase() + report.style.slice(1)
                : 'Business',
              date: report.createdAt ? new Date(report.createdAt).toLocaleString() : 'Unknown',
              id: report.id,
              downloads: [], // Will be populated when report is completed
            };
            return (
              <div
                key={report.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ReportItem {...formattedReport} />
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <Pagination className="pt-2">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={
                  currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

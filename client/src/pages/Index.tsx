import { ActiveWorkflows } from '@/components/ActiveWorkflows';
import { RecentReports } from '@/components/RecentReports';
import { ReportForm } from '@/components/ReportForm';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <header className="mb-10 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs font-medium">
                Temporal + OpenAI
              </Badge>
              <Badge variant="outline" className="text-xs font-medium border-border/50">
                Durable workflows
              </Badge>
            </div>
            <ThemeToggle />
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                AI Report Generator
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Upload data or JSON, kick off a Temporal workflow, and track progress with retries,
                heartbeats, and idempotent exports.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="border-border/50 hover:bg-muted/50 shrink-0 self-start"
              onClick={() => window.open('http://localhost:3000/api/docs', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              API docs: /api/docs
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div
            className="lg:col-span-3 space-y-6 animate-fade-in"
            style={{ animationDelay: '200ms' }}
          >
            <ReportForm />
          </div>

          <div
            className="lg:col-span-2 space-y-6 animate-fade-in"
            style={{ animationDelay: '300ms' }}
          >
            <ActiveWorkflows />
            <RecentReports />
          </div>
        </div>

        {/* Footer */}
        <footer
          className="mt-12 pt-6 border-t border-border/30 text-center animate-fade-in"
          style={{ animationDelay: '400ms' }}
        >
          <p className="text-sm text-muted-foreground">
            Backend: <span className="text-foreground/80">http://localhost:3000</span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;

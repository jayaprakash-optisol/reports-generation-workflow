# Report Generation Client App

Modern React client application for the AI-Powered Report Generator. Built with React, TypeScript, Vite, TanStack Query, and Shadcn UI.

## Features

- 📝 **Report Creation**: Create reports with inline JSON data or file uploads (CSV, JSON, text, markdown)
- 📊 **Real-time Status**: Live progress tracking with automatic polling for active workflows
- 📥 **Download Reports**: Download completed reports in PDF, DOCX, or HTML formats
- 🎨 **Modern UI**: Beautiful, responsive interface with dark mode support
- ⚡ **Fast & Efficient**: Built with Vite for lightning-fast development and optimized builds
- 🔄 **Auto-refresh**: Automatic data refetching to keep reports list up-to-date
- 🚫 **Cancel Workflows**: Cancel in-progress report generation

## Prerequisites

- Node.js 20+
- Running Report Generation API (see main README.md)

## Quick Start

### 1. Install Dependencies

```bash
cd client
npm install
```

### 2. Configure Environment

The client needs to know where the API is running. By default, it's configured for `http://localhost:3000/api`.

If your API is running on a different port or host, create/edit `.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at http://localhost:5173 (or the next available port).

### 4. Start Using the App

1. **Create a Report**:
   - Fill in the report title
   - Select a style (Business, Research, or Technical)
   - Choose output formats (PDF, DOCX, HTML)
   - Add custom instructions (optional)
   - Either paste JSON data or upload files
   - Click "Generate report"

2. **Monitor Progress**:
   - View active workflows in the "Active workflows" section
   - Real-time progress updates with status badges
   - Progress bar shows completion percentage

3. **Download Reports**:
   - Completed reports appear in "Recent Reports"
   - Click download buttons to get files in different formats
   - Files are downloaded with formatted names

4. **Manage Reports**:
   - Cancel in-progress reports if needed
   - Refresh the reports list manually
   - Auto-refresh every 5 seconds

## Project Structure

```
client/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Shadcn UI components
│   │   ├── ActiveWorkflows.tsx
│   │   ├── RecentReports.tsx
│   │   ├── ReportForm.tsx
│   │   └── ReportItem.tsx
│   ├── hooks/              # Custom React hooks
│   │   └── useReports.ts   # API hooks with React Query
│   ├── lib/                # Utility libraries
│   │   └── api.ts          # API client
│   ├── pages/              # Page components
│   ├── types/              # TypeScript type definitions
│   │   └── api.ts          # API types
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Entry point
├── .env                    # Environment variables
├── .env.example            # Environment template
├── package.json
└── vite.config.ts
```

## API Integration

The client integrates with all API endpoints:

### Report Management
- `POST /api/reports` - Create report with JSON data
- `POST /api/reports/upload` - Create report with file uploads
- `GET /api/reports` - List all reports
- `GET /api/reports/:id` - Get report status
- `GET /api/reports/:id/files?format=PDF|DOCX|HTML` - Download report
- `POST /api/reports/:id/cancel` - Cancel report generation

### Health Checks
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health with service status

## Technologies Used

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TanStack Query (React Query)** - Server state management and caching
- **Shadcn UI** - Component library
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Router** - Routing
- **Sonner** - Toast notifications

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### API Hooks

The app uses custom React Query hooks for all API operations:

```typescript
import {
  useReports,           // List all reports
  useReportStatus,      // Get single report status (with polling)
  useCreateReport,      // Create report mutation
  useUploadReport,      // Upload report mutation
  useCancelReport,      // Cancel report mutation
  downloadReport,       // Download report file
  useHealthCheck,       // Health check
} from '@/hooks/useReports';
```

## Troubleshooting

### API Connection Issues

If the client can't connect to the API:

1. Check that the API server is running: http://localhost:3000/api/health
2. Verify `VITE_API_BASE_URL` in `.env`
3. Check browser console for CORS errors
4. Ensure API server has CORS enabled for localhost during development

### Build Issues

Clear node_modules and reinstall:

```bash
rm -rf node_modules
npm install
```

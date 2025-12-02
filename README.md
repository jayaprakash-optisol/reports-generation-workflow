# AI-Powered Report Generator

An intelligent report generation system that transforms structured and unstructured data into professional multi-page reports using AI. Built with TypeScript, Temporal workflows, and OpenAI.

## Features

- **AI-Powered Content Generation**: Uses OpenAI GPT models to generate executive summaries, insights, and recommendations
- **Multiple Report Styles**: Business, Research, and Technical templates with distinct tones and layouts
- **Automatic Visualizations**: Intelligent chart suggestions based on data profiling (line, bar, pie, stacked bar charts)
- **Multiple Output Formats**: Export to PDF, DOCX, or HTML
- **Reliable Workflow Orchestration**: Temporal-based workflows with retries, status tracking, and fault tolerance
- **Data Profiling**: Automatic detection of data types, statistical summaries, and quality scoring

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   REST API      │────▶│  Temporal       │────▶│   Activities    │
│   (Express)     │     │  Workflows      │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                        ┌───────────────────────────────┼───────────────────────────────┐
                        │                               │                               │
                        ▼                               ▼                               ▼
                ┌───────────────┐              ┌───────────────┐              ┌───────────────┐
                │ Data Profiler │              │ OpenAI Service│              │ Chart Service │
                └───────────────┘              └───────────────┘              └───────────────┘
                                                        │
                        ┌───────────────────────────────┼───────────────────────────────┐
                        │                               │                               │
                        ▼                               ▼                               ▼
                ┌───────────────┐              ┌───────────────┐              ┌───────────────┐
                │ HTML Generator│              │ PDF Generator │              │ DOCX Generator│
                └───────────────┘              └───────────────┘              └───────────────┘
```

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- OpenAI API Key

## Quick Start

### 1. Clone and Install Dependencies

```bash
cd report-generation
npm install
```

### 2. Configure Environment

```bash
cp env.example .env
```

Edit `.env` and add your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

### 3. Start Temporal Server

```bash
docker-compose up -d
```

Wait for Temporal to be healthy (check at http://localhost:8080).

### 4. Start the Worker

```bash
npm run worker:dev
```

### 5. Start the API Server

In a new terminal:

```bash
npm run dev
```

The API will be available at http://localhost:3000.

## API Reference

### Create Report

**POST** `/api/reports`

Create a new report from structured/unstructured data.

```bash
curl -X POST http://localhost:3000/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {
        "type": "structured",
        "format": "json",
        "data": [
          {"month": "January", "revenue": 45000, "customers": 120},
          {"month": "February", "revenue": 52000, "customers": 145},
          {"month": "March", "revenue": 48000, "customers": 132}
        ]
      }
    ],
    "config": {
      "title": "Q1 Business Report",
      "style": "business",
      "outputFormats": ["PDF", "HTML"]
    }
  }'
```

**Response:**

```json
{
  "reportId": "abc123xyz",
  "workflowId": "report-abc123xyz",
  "status": "QUEUED",
  "statusUrl": "/reports/abc123xyz"
}
```

### Upload Files

**POST** `/api/reports/upload`

Create a report from file uploads (CSV, JSON, text, markdown).

```bash
curl -X POST http://localhost:3000/api/reports/upload \
  -F "files=@data.csv" \
  -F "title=Sales Analysis Report" \
  -F "style=business" \
  -F "outputFormats=PDF,HTML"
```

### Get Report Status

**GET** `/api/reports/:reportId`

```bash
curl http://localhost:3000/api/reports/abc123xyz
```

**Response:**

```json
{
  "id": "abc123xyz",
  "title": "Q1 Business Report",
  "style": "business",
  "status": "COMPLETED",
  "progress": 100,
  "files": [
    {
      "format": "PDF",
      "url": "/reports/abc123xyz/files?format=PDF",
      "size": 245678
    }
  ]
}
```

### Download Report

**GET** `/api/reports/:reportId/files?format=PDF|DOCX|HTML`

```bash
curl -O http://localhost:3000/api/reports/abc123xyz/files?format=PDF
```

### List All Reports

**GET** `/api/reports`

```bash
curl http://localhost:3000/api/reports
```

### Cancel Report

**POST** `/api/reports/:reportId/cancel`

```bash
curl -X POST http://localhost:3000/api/reports/abc123xyz/cancel
```

## Report Styles

### Business Style

- **Tone**: Concise, executive-friendly
- **Sections**: Executive Summary, KPIs, Trends, Risks, Recommendations
- **Best for**: Monthly reports, stakeholder updates, performance reviews

### Research Style

- **Tone**: Formal, academic
- **Sections**: Abstract, Introduction, Methodology, Results, Discussion, Conclusion
- **Best for**: Research papers, analysis reports, white papers

### Technical Style

- **Tone**: Detailed, engineering-focused
- **Sections**: Overview, System Metrics, Performance Analysis, Error Analysis, Recommendations
- **Best for**: Technical reports, incident reports, system documentation

## Input Data Formats

### Structured Data (JSON)

```json
{
  "type": "structured",
  "format": "json",
  "data": [
    { "date": "2024-01-01", "metric": 100, "category": "A" },
    { "date": "2024-01-02", "metric": 150, "category": "B" }
  ]
}
```

### Structured Data (CSV)

```json
{
  "type": "structured",
  "format": "csv",
  "data": "date,metric,category\n2024-01-01,100,A\n2024-01-02,150,B"
}
```

### Unstructured Data

```json
{
  "type": "unstructured",
  "format": "text",
  "content": "Additional context and notes about the data..."
}
```

## Configuration Options

### Report Config

```typescript
{
  title: string;              // Report title (required)
  style: 'business' | 'research' | 'technical';
  outputFormats: ('PDF' | 'DOCX' | 'HTML')[];
  branding?: {
    logoUrl?: string;
    primaryColor?: string;    // e.g., "#1a365d"
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    companyName?: string;
  };
  sectionsToInclude?: string[];
  sectionsToExclude?: string[];
  authorName?: string;
  customPromptInstructions?: string;
}
```

## Workflow States

| Status               | Description                               |
| -------------------- | ----------------------------------------- |
| `QUEUED`             | Report request received, waiting to start |
| `DATA_PROFILING`     | Analyzing and profiling input data        |
| `INSIGHT_GENERATION` | AI generating narrative content           |
| `CHART_GENERATION`   | Creating visualizations                   |
| `LAYOUT_RENDERING`   | Assembling report layout                  |
| `EXPORTING`          | Converting to requested formats           |
| `COMPLETED`          | Report ready for download                 |
| `FAILED`             | Error occurred during generation          |

## Development

### Project Structure

```
src/
├── api/
│   └── routes.ts           # Express API routes
├── config/
│   └── index.ts            # Configuration management
├── services/
│   ├── data-profiler.ts    # Data analysis and profiling
│   ├── openai-service.ts   # OpenAI integration
│   ├── chart-generator.ts  # Chart creation
│   ├── pdf-generator.ts    # PDF export
│   └── docx-generator.ts   # DOCX export
├── templates/
│   ├── styles.ts           # Report style configurations
│   └── html-generator.ts   # HTML report generation
├── temporal/
│   ├── activities.ts       # Temporal activities
│   ├── workflows.ts        # Temporal workflows
│   ├── worker.ts           # Temporal worker
│   └── client.ts           # Temporal client
├── types/
│   └── index.ts            # TypeScript types
├── utils/
│   ├── logger.ts           # Logging utility
│   └── storage.ts          # File storage
└── index.ts                # Application entry point
```

### Scripts

```bash
npm run dev          # Start API server in development mode
npm run worker:dev   # Start Temporal worker in development mode
npm run build        # Build TypeScript
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run test         # Run tests
```

### Temporal UI

Access the Temporal Web UI at http://localhost:8080 to:

- Monitor workflow executions
- View workflow history
- Debug failed workflows
- Query workflow state

## Production Deployment

### Environment Variables

| Variable             | Description             | Default        |
| -------------------- | ----------------------- | -------------- |
| `PORT`               | API server port         | 3000           |
| `NODE_ENV`           | Environment             | development    |
| `OPENAI_API_KEY`     | OpenAI API key          | (required)     |
| `OPENAI_MODEL`       | GPT model to use        | gpt-4o         |
| `TEMPORAL_ADDRESS`   | Temporal server address | localhost:7233 |
| `TEMPORAL_NAMESPACE` | Temporal namespace      | default        |
| `STORAGE_PATH`       | Base storage directory  | ./storage      |
| `LOG_LEVEL`          | Logging level           | info           |

### Docker Deployment

Build and run with Docker:

```bash
# Build the image
docker build -t report-generator .

# Run with environment variables
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=sk-your-key \
  -e TEMPORAL_ADDRESS=temporal:7233 \
  -v ./storage:/app/storage \
  report-generator
```

### Scaling

- **API Servers**: Scale horizontally behind a load balancer
- **Temporal Workers**: Add more worker instances for increased throughput
- **Storage**: Use cloud object storage (S3, GCS) for production

## Troubleshooting

### Temporal Connection Failed

Ensure Temporal is running:

```bash
docker-compose ps
docker-compose logs temporal
```

### OpenAI Rate Limits

The system uses retry logic with exponential backoff. For high volume:

- Use a higher-tier OpenAI plan
- Implement request queuing
- Consider using Azure OpenAI

### PDF Generation Issues

Ensure Puppeteer dependencies are installed:

```bash
# macOS
brew install chromium

# Ubuntu/Debian
apt-get install chromium-browser
```

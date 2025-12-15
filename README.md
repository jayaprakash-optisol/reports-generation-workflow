# AI-Powered Report Generator

An intelligent report generation system that transforms structured and unstructured data into professional multi-page reports using AI. Built with TypeScript, Temporal workflows, and OpenAI.

## Features

- **AI-Powered Content Generation**: Uses OpenAI GPT models to generate executive summaries, insights, and recommendations
- **Multiple Report Styles**: Business, Research, and Technical templates with distinct tones and layouts
- **Automatic Visualizations**: Intelligent chart suggestions based on data profiling (line, bar, pie, stacked bar charts)
- **Multiple Output Formats**: Export to PDF, DOCX, or HTML
- **Reliable Workflow Orchestration**: Temporal-based workflows with retries, status tracking, and fault tolerance
- **Data Profiling**: Automatic detection of data types, statistical summaries, and quality scoring
- **Large File Processing**: Automatic chunking and processing of large files (>10MB) using Docling for document extraction
- **TOON Inputs**: To reduce LLM token cost.=
- **Multi-Format Support**: Supports CSV, JSON, Excel, PDF, DOCX, PPT, and more with intelligent format detection

## Demo

![Demo](./Demo.gif)

## Architecture

![System Architecture](./Architecture.png)

### Components Overview

| Layer                | Components                                     | Description                              |
| -------------------- | ---------------------------------------------- | ---------------------------------------- |
| **Clients**          | Web App, API Clients, CLI                      | User interfaces for report generation    |
| **API Service**      | Express.js, Multer, Zod                        | REST API with file upload and validation |
| **Workflow Engine**  | Temporal Server, Worker, UI                    | Durable workflow orchestration           |
| **Processing Layer** | Data Profiler, Chart Generator, Doc Generators | Data analysis and document creation      |
| **AI Layer**         | LLM Service, OpenAI API                        | AI-powered insight generation            |
| **Storage Layer**    | MinIO/S3, PostgreSQL                           | Object storage and Temporal persistence  |
| **Observability**    | Pino Logger, Prometheus, OpenTelemetry         | Logging and monitoring                   |

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

### 3. Start Services with Docker Compose

```bash
docker-compose up -d
```

This starts:

- **Temporal Server** (http://localhost:7233) - Workflow orchestration
- **Temporal UI** (http://localhost:8080) - Workflow monitoring
- **PostgreSQL** (localhost:5432) - Temporal persistence
- **MinIO** (http://localhost:9000) - Object storage
- **Redis** (localhost:6379) - Caching
- **Docling** (http://localhost:5001) - Large file processing

Wait for services to be healthy. Check Temporal UI at http://localhost:8080.

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

### 6. Access API Documentation

Interactive Swagger documentation is available at:

- **Swagger UI**: http://localhost:3000/api/docs
- **OpenAPI JSON**: http://localhost:3000/api/docs/json
- **OpenAPI YAML**: http://localhost:3000/api/docs/yaml

The OpenAPI specification is maintained in the `swagger/` folder and is separate from the codebase.

## API Documentation

### Interactive Documentation

The API includes comprehensive Swagger/OpenAPI documentation:

- **Swagger UI**: Visit http://localhost:3000/api/docs for interactive API documentation
- **OpenAPI Spec**: Available at http://localhost:3000/api/docs/json (JSON) or `/api/docs/yaml` (YAML)

The OpenAPI specification is maintained separately in the `swagger/` folder and is not embedded in the code.

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


## Large File Processing with Docling

The system automatically uses [Docling](https://github.com/DS4SD/docling) for processing large files (>10MB by default). Docling provides intelligent document parsing, chunking, and content extraction for various document formats.

### How It Works

1. **File Size Check**: When files are uploaded, the system checks their size against the configured threshold (`DOCLING_CHUNK_SIZE_MB`, default: 10MB)
2. **Automatic Routing**: Files larger than the threshold are automatically sent to Docling for processing
3. **Intelligent Chunking**: Docling extracts and chunks content intelligently, preserving document structure
4. **Status Tracking**: Real-time processing status is available via the file processing status endpoint
5. **Fallback**: If Docling processing fails, the system automatically falls back to direct file processing

### Configuration

Configure Docling in your `.env` file:

```env
# Docling Configuration
DOCLING_ENABLED=true                    # Enable/disable Docling
DOCLING_URL=http://localhost:5001      # Docling service URL
DOCLING_CHUNK_SIZE_MB=10                # Threshold for using Docling (in MB)
DOCLING_TIMEOUT_MS=300000               # Processing timeout (5 minutes)
```

### Starting Docling Service

Docling is included in the Docker Compose setup:

```bash
docker-compose up -d docling
```

The Docling service will be available at `http://localhost:5001` with a web UI for testing and monitoring.

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
├── core/
│   ├── config/            # Configuration management
│   ├── interfaces/        # Service interfaces
│   ├── logger/            # Logging utilities
│   └── utils/             # Core utilities
├── modules/
│   ├── health/            # Health check endpoints
│   ├── reports/           # Report API routes & controllers
│   └── swagger/           # API documentation
├── services/
│   ├── ai/                # OpenAI integration
│   ├── cache/             # Redis caching
│   ├── cost/              # Cost tracking
│   ├── data/              # Data profiling
│   ├── docling/           # Large file processing
│   ├── generators/        # Report generators (PDF, DOCX, HTML)
│   └── storage/           # File storage (Local/MinIO)
├── shared/
│   ├── types/             # TypeScript types
│   └── utils/             # Shared utilities
├── temporal/
│   ├── activities/        # Temporal activities
│   ├── workflows/         # Temporal workflows
│   ├── worker.ts          # Temporal worker
│   └── client.ts          # Temporal client
└── index.ts               # Application entry point
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

| Variable                | Description              | Default        |
| ----------------------- | ------------------------ | -------------- |
| `PORT`                  | API server port          | 3000           |
| `NODE_ENV`              | Environment              | development    |
| `OPENAI_API_KEY`        | OpenAI API key           | (required)     |
| `OPENAI_MODEL`          | GPT model to use         | gpt-4o         |
| `TEMPORAL_ADDRESS`      | Temporal server address  | localhost:7233 |
| `TEMPORAL_NAMESPACE`    | Temporal namespace       | default        |
| `STORAGE_PATH`          | Base storage directory   | ./storage      |
| `LOG_LEVEL`             | Logging level            | info           |
| `DOCLING_ENABLED`       | Enable Docling service   | true           |
| `DOCLING_URL`           | Docling service URL      | localhost:5001 |
| `DOCLING_CHUNK_SIZE_MB` | File size threshold (MB) | 10             |
| `DOCLING_TIMEOUT_MS`    | Processing timeout (ms)  | 300000         |

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

### Docling Service Issues

If large file processing fails:

1. **Check Docling is running:**

   ```bash
   docker-compose ps docling
   curl http://localhost:5001/health
   ```

2. **Check Docling logs:**

   ```bash
   docker-compose logs docling
   ```

3. **Verify configuration:**
   - Ensure `DOCLING_ENABLED=true` in `.env`
   - Check `DOCLING_URL` matches the service URL
   - Verify file size threshold (`DOCLING_CHUNK_SIZE_MB`)

4. **Fallback behavior:**
   - If Docling is unavailable, the system automatically falls back to direct file processing
   - Small files (< 10MB) are always processed directly

## Upcoming Features

The following features are planned for the next version:

### Multimodal Support

- **LLM Flexibility**: Add support for all major LLM providers (OpenAI, Anthropic, Google, Azure OpenAI, and local models like Llama, Mistral, etc.)
- **LLM Selection**: Allow per-report or per-feature selection of the LLM to use
- **Multimodal Capabilities**: Enable generating reports from images, PDFs, and audio/video files
- **Image Analysis & Charts**: Leverage vision models to automatically extract charts, tables, or key data from scanned documents or screenshots
- **OCR Support**: Extract text from photos or scanned docs
- **Inline Images in Reports**: Support for inserting and captioning images using vision-language models

> **Example Use Cases**:
>
> - Upload a PDF or image and generate a report with auto-extracted insights
> - Summarize charts shown in a screenshot
> - Handle multilingual audio transcription and summary

### Access Control & Role-Based Permissions

- **Role-Based Access Control (RBAC)**: Implement user roles (Admin, Editor, Viewer) with granular permissions
- **User Management**: User registration, authentication, and profile management

### Report Sharing & Collaboration

- **Share Reports**: Share reports with specific users or user groups
- **Access Control Lists**: Manage who can view, download, or edit shared reports
- **Public Links**: Generate shareable links with optional expiration and password protection
- **Collaboration Features**: Comments, annotations, and version history for reports

### Human-in-the-Loop (HIL) Approval Workflow

- **Admin Approval Workflow**: All generated reports require admin approval before being accessible to other users
- **Review Queue**: Admins can view and manage a queue of pending reports awaiting approval
- **Approval Actions**: Admins can approve or reject reports with optional comments
- **Notifications**:
  - Report creators receive notifications when their reports are:
    - Submitted for review
    - Approved (with optional admin comments)
    - Rejected (with rejection reason/comments)
  - Admins receive notifications when new reports are submitted for review
- **Status Tracking**: Reports have additional statuses:
  - `PENDING_APPROVAL` - Awaiting admin review
  - `APPROVED` - Approved and accessible to authorized users
  - `REJECTED` - Rejected with reason, visible only to creator and admins
- **Revision Workflow**: Rejected reports can be revised and resubmitted for approval

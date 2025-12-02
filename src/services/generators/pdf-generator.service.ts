import type { Browser } from 'puppeteer';
import puppeteer from 'puppeteer';

import { createModuleLogger, type IPDFGenerator } from '../../core/index.js';
import { storage } from '../storage/index.js';

const logger = createModuleLogger('pdf-generator');

export class PDFGenerator implements IPDFGenerator {
  private browser: Browser | null = null;

  /**
   * Initialize the browser instance
   */
  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
      logger.info('PDF generator browser initialized');
    }
  }

  /**
   * Close the browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('PDF generator browser closed');
    }
  }

  /**
   * Generate PDF from HTML content with modern styling
   */
  async generateFromHTML(
    html: string,
    reportId: string,
    filename: string
  ): Promise<{ path: string; size: number }> {
    await this.initialize();

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    try {
      // Inject print-specific CSS for PDF generation
      const printOptimizedHtml = this.injectPrintStyles(html);

      // Set content
      await page.setContent(printOptimizedHtml, {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });

      // Wait for any fonts to load
      await page.evaluateHandle('document.fonts.ready');

      // Generate PDF with modern styling
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1.5cm',
          right: '1.5cm',
          bottom: '2cm',
          left: '1.5cm',
        },
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="
            font-family: 'Inter', 'Segoe UI', sans-serif;
            font-size: 9px;
            color: #667eea;
            width: 100%;
            padding: 0 1.5cm;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <span style="font-weight: 600;">AI Report Generator</span>
            <span style="color: #718096;">${new Date().toLocaleDateString()}</span>
          </div>
        `,
        footerTemplate: `
          <div style="
            font-family: 'Inter', 'Segoe UI', sans-serif;
            font-size: 9px;
            color: #718096;
            width: 100%;
            padding: 0 1.5cm;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #e2e8f0;
            padding-top: 0.5cm;
          ">
            <span>Generated with AI Report Generator</span>
            <span style="
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              font-weight: 600;
            ">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `,
      });

      // Save PDF
      const path = await storage.saveOutputFile(reportId, filename, Buffer.from(pdfBuffer));
      const size = pdfBuffer.length;

      logger.info(`Generated PDF: ${filename} (${(size / 1024).toFixed(1)} KB)`);

      return { path, size };
    } finally {
      await page.close();
    }
  }

  /**
   * Inject print-specific styles for better PDF output
   */
  private injectPrintStyles(html: string): string {
    const printStyles = `
      <style>
        @media print {
          /* Hide sidebar in print view */
          .dashboard-sidebar {
            display: none !important;
          }

          .dashboard-layout {
            display: block !important;
          }

          .dashboard-main {
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Ensure cards print properly */
          .card, .section-card, .metric-card, .chart-container, .table-container {
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Metric cards in print */
          .metrics-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 1rem !important;
          }

          .metric-card {
            padding: 1rem !important;
          }

          /* Ensure gradients work in print */
          .cover-page {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          /* Better table printing */
          table {
            page-break-inside: auto !important;
          }

          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }

          /* Section page breaks */
          .section {
            page-break-inside: avoid !important;
          }

          h2 {
            page-break-after: avoid !important;
          }

          /* Chart page breaks */
          .chart-container {
            page-break-inside: avoid !important;
          }

          /* Remove interactive elements */
          .btn-primary {
            display: none !important;
          }

          /* Ensure background colors print */
          * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      </style>
    `;

    // Insert print styles before closing </head>
    return html.replace('</head>', `${printStyles}</head>`);
  }

  /**
   * Generate PDF with custom options
   */
  async generateWithOptions(
    html: string,
    reportId: string,
    filename: string,
    options: {
      landscape?: boolean;
      pageSize?: 'A4' | 'Letter' | 'Legal';
      scale?: number;
    } = {}
  ): Promise<{ path: string; size: number }> {
    await this.initialize();

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    try {
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });

      await page.evaluateHandle('document.fonts.ready');

      const pdfBuffer = await page.pdf({
        format: options.pageSize ?? 'A4',
        landscape: options.landscape ?? false,
        scale: options.scale ?? 1,
        printBackground: true,
        margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm',
        },
      });

      const path = await storage.saveOutputFile(reportId, filename, Buffer.from(pdfBuffer));
      const size = pdfBuffer.length;

      return { path, size };
    } finally {
      await page.close();
    }
  }

  /**
   * Take a screenshot of HTML content (for previews)
   */
  async generatePreview(
    html: string,
    reportId: string,
    filename: string
  ): Promise<{ path: string; size: number }> {
    await this.initialize();

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    try {
      await page.setViewport({ width: 1200, height: 1600 });
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage: false,
      });

      const path = await storage.saveOutputFile(reportId, filename, Buffer.from(screenshotBuffer));
      const size = screenshotBuffer.length;

      logger.info(`Generated preview: ${filename}`);

      return { path, size };
    } finally {
      await page.close();
    }
  }
}

import puppeteer, { Browser } from 'puppeteer';
import { storage } from '../utils/storage.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('pdf-generator');

export class PDFGenerator {
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
   * Generate PDF from HTML content
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
      // Set content
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });

      // Wait for any fonts to load
      await page.evaluateHandle('document.fonts.ready');

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm',
        },
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; color: #718096; width: 100%; padding: 0 2cm;">
            <span style="float: left;"></span>
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; color: #718096; width: 100%; padding: 0 2cm; display: flex; justify-content: space-between;">
            <span>AI Report Generator</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
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
        format: options.pageSize || 'A4',
        landscape: options.landscape || false,
        scale: options.scale || 1,
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

      const path = await storage.saveOutputFile(
        reportId,
        filename,
        Buffer.from(screenshotBuffer)
      );
      const size = screenshotBuffer.length;

      logger.info(`Generated preview: ${filename}`);

      return { path, size };
    } finally {
      await page.close();
    }
  }
}

export const pdfGenerator = new PDFGenerator();


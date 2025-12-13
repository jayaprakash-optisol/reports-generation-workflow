import { config } from '../../core/config/index.js';
import { createModuleLogger } from '../../core/index.js';
import type {
  DoclingChunk,
  DoclingProcessResult,
  FileProcessingStatus,
} from '../../shared/types/index.js';

const logger = createModuleLogger('docling-service');

/**
 * Docling Service - Handles document processing and chunking via Docling API
 */
export class DoclingService {
  private readonly baseUrl: string;
  private readonly enabled: boolean;
  private readonly timeout: number;
  private readonly processingStatuses: Map<string, FileProcessingStatus> = new Map();

  constructor() {
    this.baseUrl = config.docling.url;
    this.enabled = config.docling.enabled;
    this.timeout = config.docling.timeoutMs;
  }

  /**
   * Check if docling is enabled and available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      logger.warn('Docling service not available', { error });
      return false;
    }
  }

  /**
   * Process a file through docling
   */
  async processFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    fileId: string
  ): Promise<DoclingProcessResult> {
    if (!this.enabled) {
      throw new Error('Docling service is not enabled');
    }

    // Update status to processing
    this.updateProcessingStatus(fileId, {
      status: 'processing',
      progress: 0,
      startedAt: new Date().toISOString(),
    });

    try {
      // Create form data
      // Use Node.js compatible FormData (available in Node 18+)
      const formData = new FormData();
      // Create a File-like object for FormData
      const fileBlob = new Blob([fileBuffer], { type: mimeType });
      formData.append('file', fileBlob, filename);

      // Update status
      this.updateProcessingStatus(fileId, { progress: 20 });

      // Send to docling API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(`${this.baseUrl}/api/v1/document/convert`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Docling API error: ${response.status} - ${errorText}`);
        }

        this.updateProcessingStatus(fileId, { progress: 60 });

        const result = (await response.json()) as {
          document_id?: string;
          content?: unknown;
          text?: unknown;
          page_count?: number;
          word_count?: number;
          processing_time?: number;
        };

        // Extract chunks from docling response
        const chunks = this.extractChunks(result);

        this.updateProcessingStatus(fileId, {
          progress: 100,
          status: 'completed',
          chunksProcessed: chunks.length,
          totalChunks: chunks.length,
          completedAt: new Date().toISOString(),
        });

        return {
          success: true,
          documentId: result.document_id ?? fileId,
          chunks,
          metadata: {
            pageCount: result.page_count,
            wordCount: result.word_count,
            processingTime: result.processing_time,
          },
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to process file with docling', { error, fileId, filename });

      this.updateProcessingStatus(fileId, {
        status: 'failed',
        error: errorMessage,
        completedAt: new Date().toISOString(),
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Extract chunks from docling response
   */
  private extractChunks(result: { content?: unknown; text?: unknown }): DoclingChunk[] {
    const chunks: DoclingChunk[] = [];

    // Docling typically returns structured content
    // Adjust based on actual docling API response format
    if (result.content) {
      if (Array.isArray(result.content)) {
        result.content.forEach((item: unknown, index: number) => {
          const itemObj = item as {
            page_number?: number;
            section?: string;
            metadata?: Record<string, unknown>;
          };
          chunks.push({
            id: `chunk-${index}`,
            content: typeof item === 'string' ? item : JSON.stringify(item),
            pageNumber: itemObj.page_number,
            section: itemObj.section,
            metadata: itemObj.metadata,
          });
        });
      } else if (typeof result.content === 'string') {
        // If content is a single string, split into chunks
        const chunkSize = 5000; // characters per chunk
        const { content } = result;
        let chunkIndex = 0;

        for (let i = 0; i < content.length; i += chunkSize) {
          chunks.push({
            id: `chunk-${chunkIndex++}`,
            content: content.slice(i, i + chunkSize),
            metadata: { startIndex: i, endIndex: Math.min(i + chunkSize, content.length) },
          });
        }
      }
    }

    // If no content found, try alternative formats
    if (chunks.length === 0 && result.text) {
      const text = typeof result.text === 'string' ? result.text : JSON.stringify(result.text);
      const chunkSize = 5000;
      let chunkIndex = 0;

      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push({
          id: `chunk-${chunkIndex++}`,
          content: text.slice(i, i + chunkSize),
          metadata: { startIndex: i, endIndex: Math.min(i + chunkSize, text.length) },
        });
      }
    }

    return chunks;
  }

  /**
   * Get processing status for a file
   */
  getProcessingStatus(fileId: string): FileProcessingStatus | null {
    return this.processingStatuses.get(fileId) ?? null;
  }

  /**
   * Update processing status
   */
  private updateProcessingStatus(fileId: string, updates: Partial<FileProcessingStatus>): void {
    const current = this.processingStatuses.get(fileId) ?? {
      fileId,
      filename: '',
      status: 'pending' as const,
      progress: 0,
    };

    this.processingStatuses.set(fileId, {
      ...current,
      ...updates,
    });
  }

  /**
   * Initialize processing status
   */
  initializeProcessingStatus(fileId: string, filename: string): void {
    this.processingStatuses.set(fileId, {
      fileId,
      filename,
      status: 'pending',
      progress: 0,
    });
  }

  /**
   * Clean up old processing statuses (older than 1 hour)
   */
  cleanupOldStatuses(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [fileId, { completedAt }] of this.processingStatuses.entries()) {
      if (completedAt) {
        const completedTime = new Date(completedAt).getTime();
        if (completedTime < oneHourAgo) {
          this.processingStatuses.delete(fileId);
        }
      }
    }
  }
}

// Export singleton instance
export const doclingService = new DoclingService();

// Cleanup old statuses every 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      doclingService.cleanupOldStatuses();
    },
    30 * 60 * 1000
  );
}

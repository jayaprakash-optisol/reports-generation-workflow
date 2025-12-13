/**
 * Docling Service Types
 */

export interface DoclingProcessResult {
  success: boolean;
  documentId?: string;
  chunks?: DoclingChunk[];
  error?: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    processingTime?: number;
  };
}

export interface DoclingChunk {
  id: string;
  content: string;
  pageNumber?: number;
  section?: string;
  metadata?: Record<string, unknown>;
}

export interface FileProcessingStatus {
  fileId: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  chunksProcessed?: number;
  totalChunks?: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

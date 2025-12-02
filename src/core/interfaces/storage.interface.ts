/**
 * Storage Service Interface
 * Defines the contract for storage operations across different backends (local, MinIO, etc.)
 */
export interface IStorageService {
  /**
   * Initialize the storage service (create directories, verify connections, etc.)
   */
  initialize(): Promise<void>;

  // Report operations
  saveReport(reportId: string, data: object): Promise<void>;
  getReport(reportId: string): Promise<object | null>;
  listReports(): Promise<string[]>;

  // Upload operations
  saveUpload(reportId: string, filename: string, data: Buffer | string): Promise<string>;
  getUpload(reportId: string, filename: string): Promise<Buffer | null>;

  // Chart operations
  saveChart(reportId: string, chartId: string, imageData: Buffer): Promise<string>;
  getChart(reportId: string, chartId: string): Promise<Buffer | null>;

  // Output file operations
  saveOutputFile(reportId: string, filename: string, data: Buffer): Promise<string>;
  getOutputFile(reportId: string, filename: string): Promise<Buffer | null>;
  getOutputFilePath(reportId: string, filename: string): Promise<string>;

  // Utility operations
  fileExists(filePath: string): Promise<boolean>;
  getFileSize(filePath: string): Promise<number>;
}


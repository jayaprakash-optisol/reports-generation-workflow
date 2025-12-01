import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';
import { createModuleLogger } from './logger.js';

const logger = createModuleLogger('storage');

export class StorageService {
  private basePath: string;
  private reportsPath: string;
  private uploadsPath: string;
  private chartsPath: string;

  constructor() {
    this.basePath = config.storage.basePath;
    this.reportsPath = config.storage.reportsPath;
    this.uploadsPath = config.storage.uploadsPath;
    this.chartsPath = config.storage.chartsPath;
  }

  async initialize(): Promise<void> {
    const dirs = [this.basePath, this.reportsPath, this.uploadsPath, this.chartsPath];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
      logger.info(`Ensured directory exists: ${dir}`);
    }
  }

  // Report operations
  async saveReport(reportId: string, data: object): Promise<void> {
    const filePath = path.join(this.reportsPath, `${reportId}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    logger.debug(`Saved report metadata: ${reportId}`);
  }

  async getReport(reportId: string): Promise<object | null> {
    const filePath = path.join(this.reportsPath, `${reportId}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async listReports(): Promise<string[]> {
    const files = await fs.readdir(this.reportsPath);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  // Upload operations
  async saveUpload(reportId: string, filename: string, data: Buffer | string): Promise<string> {
    const reportDir = path.join(this.uploadsPath, reportId);
    await fs.mkdir(reportDir, { recursive: true });
    
    const filePath = path.join(reportDir, filename);
    await fs.writeFile(filePath, data);
    logger.debug(`Saved upload: ${filePath}`);
    return filePath;
  }

  async getUpload(reportId: string, filename: string): Promise<Buffer | null> {
    const filePath = path.join(this.uploadsPath, reportId, filename);
    try {
      return await fs.readFile(filePath);
    } catch {
      return null;
    }
  }

  // Chart operations
  async saveChart(reportId: string, chartId: string, imageData: Buffer): Promise<string> {
    const reportDir = path.join(this.chartsPath, reportId);
    await fs.mkdir(reportDir, { recursive: true });
    
    const filePath = path.join(reportDir, `${chartId}.png`);
    await fs.writeFile(filePath, imageData);
    logger.debug(`Saved chart: ${filePath}`);
    return filePath;
  }

  async getChart(reportId: string, chartId: string): Promise<Buffer | null> {
    const filePath = path.join(this.chartsPath, reportId, `${chartId}.png`);
    try {
      return await fs.readFile(filePath);
    } catch {
      return null;
    }
  }

  // Output file operations
  async saveOutputFile(reportId: string, filename: string, data: Buffer): Promise<string> {
    const reportDir = path.join(this.reportsPath, reportId, 'outputs');
    await fs.mkdir(reportDir, { recursive: true });
    
    const filePath = path.join(reportDir, filename);
    await fs.writeFile(filePath, data);
    logger.info(`Saved output file: ${filePath}`);
    return filePath;
  }

  async getOutputFile(reportId: string, filename: string): Promise<Buffer | null> {
    const filePath = path.join(this.reportsPath, reportId, 'outputs', filename);
    try {
      return await fs.readFile(filePath);
    } catch {
      return null;
    }
  }

  async getOutputFilePath(reportId: string, filename: string): Promise<string> {
    return path.join(this.reportsPath, reportId, 'outputs', filename);
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }
}

export const storage = new StorageService();


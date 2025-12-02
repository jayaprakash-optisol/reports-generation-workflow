import fs from 'node:fs/promises';
import path from 'node:path';

import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type _Object,
} from '@aws-sdk/client-s3';

import { config } from '../config/index.js';

import { createModuleLogger } from './logger.js';

const logger = createModuleLogger('storage');

// S3 Client for MinIO
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const endpoint = new URL(config.minio.endpoint);
    s3Client = new S3Client({
      endpoint: config.minio.endpoint,
      region: 'us-east-1', // MinIO doesn't require a specific region
      credentials: {
        accessKeyId: config.minio.accessKey,
        secretAccessKey: config.minio.secretKey,
      },
      forcePathStyle: true, // Required for MinIO
      tls: endpoint.protocol === 'https:',
    });
  }
  return s3Client;
}

export class StorageService {
  private readonly basePath: string;
  private readonly reportsPath: string;
  private readonly uploadsPath: string;
  private readonly chartsPath: string;
  private readonly storageType: 'local' | 'minio';

  constructor() {
    this.basePath = config.storage.basePath;
    this.reportsPath = config.storage.reportsPath;
    this.uploadsPath = config.storage.uploadsPath;
    this.chartsPath = config.storage.chartsPath;
    this.storageType = config.storage.type;
  }

  async initialize(): Promise<void> {
    if (this.storageType === 'local') {
      const dirs = [this.basePath, this.reportsPath, this.uploadsPath, this.chartsPath];

      for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
        logger.info(`Ensured directory exists: ${dir}`);
      }
    } else {
      // For MinIO, buckets are created by minio-init container
      logger.info('Using MinIO storage - buckets should be pre-created');
    }
  }

  // Report operations
  async saveReport(reportId: string, data: object): Promise<void> {
    const content = JSON.stringify(data, null, 2);

    if (this.storageType === 'minio') {
      await this.putObject(
        config.minio.buckets.reports,
        `${reportId}.json`,
        Buffer.from(content),
        'application/json'
      );
    } else {
      const filePath = path.join(this.reportsPath, `${reportId}.json`);
      await fs.writeFile(filePath, content);
    }
    logger.debug(`Saved report metadata: ${reportId}`);
  }

  async getReport(reportId: string): Promise<object | null> {
    try {
      if (this.storageType === 'minio') {
        const data = await this.getObject(config.minio.buckets.reports, `${reportId}.json`);
        return data ? JSON.parse(data.toString()) : null;
      } else {
        const filePath = path.join(this.reportsPath, `${reportId}.json`);
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch {
      return null;
    }
  }

  async listReports(): Promise<string[]> {
    if (this.storageType === 'minio') {
      const objects = await this.listObjects(config.minio.buckets.reports, '');
      return objects
        .filter(key => key.endsWith('.json') && !key.includes('/'))
        .map(key => key.replace('.json', ''));
    } else {
      const files = await fs.readdir(this.reportsPath);
      return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    }
  }

  // Upload operations
  async saveUpload(reportId: string, filename: string, data: Buffer | string): Promise<string> {
    const key = `${reportId}/${filename}`;

    if (this.storageType === 'minio') {
      const buffer = typeof data === 'string' ? Buffer.from(data) : data;
      await this.putObject(config.minio.buckets.uploads, key, buffer);
      logger.debug(`Saved upload to MinIO: ${key}`);
      return `${config.minio.endpoint}/${config.minio.buckets.uploads}/${key}`;
    } else {
      const reportDir = path.join(this.uploadsPath, reportId);
      await fs.mkdir(reportDir, { recursive: true });

      const filePath = path.join(reportDir, filename);
      await fs.writeFile(filePath, data);
      logger.debug(`Saved upload: ${filePath}`);
      return filePath;
    }
  }

  async getUpload(reportId: string, filename: string): Promise<Buffer | null> {
    const key = `${reportId}/${filename}`;

    if (this.storageType === 'minio') {
      return this.getObject(config.minio.buckets.uploads, key);
    } else {
      const filePath = path.join(this.uploadsPath, reportId, filename);
      try {
        return await fs.readFile(filePath);
      } catch {
        return null;
      }
    }
  }

  // Chart operations
  async saveChart(reportId: string, chartId: string, imageData: Buffer): Promise<string> {
    const key = `${reportId}/${chartId}.png`;

    if (this.storageType === 'minio') {
      await this.putObject(config.minio.buckets.charts, key, imageData, 'image/png');
      logger.debug(`Saved chart to MinIO: ${key}`);
      return `${config.minio.endpoint}/${config.minio.buckets.charts}/${key}`;
    } else {
      const reportDir = path.join(this.chartsPath, reportId);
      await fs.mkdir(reportDir, { recursive: true });

      const filePath = path.join(reportDir, `${chartId}.png`);
      await fs.writeFile(filePath, imageData);
      logger.debug(`Saved chart: ${filePath}`);
      return filePath;
    }
  }

  async getChart(reportId: string, chartId: string): Promise<Buffer | null> {
    const key = `${reportId}/${chartId}.png`;

    if (this.storageType === 'minio') {
      return this.getObject(config.minio.buckets.charts, key);
    } else {
      const filePath = path.join(this.chartsPath, reportId, `${chartId}.png`);
      try {
        return await fs.readFile(filePath);
      } catch {
        return null;
      }
    }
  }

  // Output file operations
  async saveOutputFile(reportId: string, filename: string, data: Buffer): Promise<string> {
    const key = `${reportId}/outputs/${filename}`;

    if (this.storageType === 'minio') {
      const contentType = this.getContentType(filename);
      await this.putObject(config.minio.buckets.reports, key, data, contentType);
      logger.info(`Saved output file to MinIO: ${key}`);
      return `${config.minio.endpoint}/${config.minio.buckets.reports}/${key}`;
    } else {
      const reportDir = path.join(this.reportsPath, reportId, 'outputs');
      await fs.mkdir(reportDir, { recursive: true });

      const filePath = path.join(reportDir, filename);
      await fs.writeFile(filePath, data);
      logger.info(`Saved output file: ${filePath}`);
      return filePath;
    }
  }

  async getOutputFile(reportId: string, filename: string): Promise<Buffer | null> {
    const key = `${reportId}/outputs/${filename}`;

    if (this.storageType === 'minio') {
      return this.getObject(config.minio.buckets.reports, key);
    } else {
      const filePath = path.join(this.reportsPath, reportId, 'outputs', filename);
      try {
        return await fs.readFile(filePath);
      } catch {
        return null;
      }
    }
  }

  async getOutputFilePath(reportId: string, filename: string): Promise<string> {
    if (this.storageType === 'minio') {
      return `${config.minio.endpoint}/${config.minio.buckets.reports}/${reportId}/outputs/${filename}`;
    } else {
      return path.join(this.reportsPath, reportId, 'outputs', filename);
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    if (this.storageType === 'minio') {
      // Parse the MinIO URL to get bucket and key
      const url = new URL(filePath);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const bucket = pathParts[0];
      const key = pathParts.slice(1).join('/');

      try {
        const client = getS3Client();
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
      } catch {
        return false;
      }
    } else {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    }
  }

  async getFileSize(filePath: string): Promise<number> {
    if (this.storageType === 'minio') {
      // Parse the MinIO URL to get bucket and key
      const url = new URL(filePath);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const bucket = pathParts[0];
      const key = pathParts.slice(1).join('/');

      const client = getS3Client();
      const response = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return response.ContentLength ?? 0;
    } else {
      const stats = await fs.stat(filePath);
      return stats.size;
    }
  }

  // Get a presigned URL for downloading (useful for MinIO)
  getPublicUrl(bucket: string, key: string): string {
    return `${config.minio.endpoint}/${bucket}/${key}`;
  }

  // MinIO/S3 helper methods
  private async putObject(
    bucket: string,
    key: string,
    data: Buffer,
    contentType?: string
  ): Promise<void> {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      })
    );
  }

  private async getObject(bucket: string, key: string): Promise<Buffer | null> {
    try {
      const client = getS3Client();
      const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

      if (response.Body) {
        const chunks: Buffer[] = [];
        for await (const chunk of response.Body as AsyncIterable<Buffer>) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      }
      return null;
    } catch {
      return null;
    }
  }

  private async listObjects(bucket: string, prefix: string): Promise<string[]> {
    try {
      const client = getS3Client();
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
        })
      );
      return (response.Contents ?? []).map((obj: _Object) => obj.Key ?? '').filter(Boolean);
    } catch {
      return [];
    }
  }

  private getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.html': 'text/html',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };
    return contentTypes[ext] ?? 'application/octet-stream';
  }
}

export const storage = new StorageService();

import path from 'node:path';

import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type _Object,
} from '@aws-sdk/client-s3';

import { config, createModuleLogger, type IStorageService } from '../../core/index.js';

const logger = createModuleLogger('minio-storage');

/**
 * MinIO/S3 storage implementation
 */
export class MinioStorageService implements IStorageService {
  private readonly client: S3Client;
  private readonly buckets: typeof config.minio.buckets;
  private readonly endpoint: string;

  constructor() {
    const endpoint = new URL(config.minio.endpoint);
    this.endpoint = config.minio.endpoint;
    this.buckets = config.minio.buckets;

    this.client = new S3Client({
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

  async initialize(): Promise<void> {
    // For MinIO, buckets are created by minio-init container
    logger.info('Using MinIO storage - buckets should be pre-created');
  }

  // Report operations
  async saveReport(reportId: string, data: object): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await this.putObject(this.buckets.reports, `${reportId}.json`, Buffer.from(content), 'application/json');
    logger.debug(`Saved report metadata: ${reportId}`);
  }

  async getReport(reportId: string): Promise<object | null> {
    try {
      const data = await this.getObject(this.buckets.reports, `${reportId}.json`);
      return data ? JSON.parse(data.toString()) : null;
    } catch {
      return null;
    }
  }

  async listReports(): Promise<string[]> {
    const objects = await this.listObjects(this.buckets.reports, '');
    return objects
      .filter(key => key.endsWith('.json') && !key.includes('/'))
      .map(key => key.replace('.json', ''));
  }

  // Upload operations
  async saveUpload(reportId: string, filename: string, data: Buffer | string): Promise<string> {
    const key = `${reportId}/${filename}`;
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    await this.putObject(this.buckets.uploads, key, buffer);
    logger.debug(`Saved upload to MinIO: ${key}`);
    return `${this.endpoint}/${this.buckets.uploads}/${key}`;
  }

  async getUpload(reportId: string, filename: string): Promise<Buffer | null> {
    const key = `${reportId}/${filename}`;
    return this.getObject(this.buckets.uploads, key);
  }

  // Chart operations
  async saveChart(reportId: string, chartId: string, imageData: Buffer): Promise<string> {
    const key = `${reportId}/${chartId}.png`;
    await this.putObject(this.buckets.charts, key, imageData, 'image/png');
    logger.debug(`Saved chart to MinIO: ${key}`);
    return `${this.endpoint}/${this.buckets.charts}/${key}`;
  }

  async getChart(reportId: string, chartId: string): Promise<Buffer | null> {
    const key = `${reportId}/${chartId}.png`;
    return this.getObject(this.buckets.charts, key);
  }

  // Output file operations
  async saveOutputFile(reportId: string, filename: string, data: Buffer): Promise<string> {
    const key = `${reportId}/outputs/${filename}`;
    const contentType = this.getContentType(filename);
    await this.putObject(this.buckets.reports, key, data, contentType);
    logger.info(`Saved output file to MinIO: ${key}`);
    return `${this.endpoint}/${this.buckets.reports}/${key}`;
  }

  async getOutputFile(reportId: string, filename: string): Promise<Buffer | null> {
    const key = `${reportId}/outputs/${filename}`;
    return this.getObject(this.buckets.reports, key);
  }

  async getOutputFilePath(reportId: string, filename: string): Promise<string> {
    return `${this.endpoint}/${this.buckets.reports}/${reportId}/outputs/${filename}`;
  }

  async fileExists(filePath: string): Promise<boolean> {
    // Parse the MinIO URL to get bucket and key
    const url = new URL(filePath);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const bucket = pathParts[0];
    const key = pathParts.slice(1).join('/');

    try {
      await this.client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async getFileSize(filePath: string): Promise<number> {
    // Parse the MinIO URL to get bucket and key
    const url = new URL(filePath);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const bucket = pathParts[0];
    const key = pathParts.slice(1).join('/');

    const response = await this.client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return response.ContentLength ?? 0;
  }

  // Private helper methods
  private async putObject(bucket: string, key: string, data: Buffer, contentType?: string): Promise<void> {
    await this.client.send(
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
      const response = await this.client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

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
      const response = await this.client.send(
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


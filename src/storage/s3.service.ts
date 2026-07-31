import {
  DeleteObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { resolveS3Config, type S3RuntimeConfig } from '../config/s3-config';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client | null = null;
  private available = false;
  private config: S3RuntimeConfig | null = null;

  isAvailable(): boolean {
    return this.available;
  }

  async onModuleInit(): Promise<void> {
    const config = resolveS3Config();

    if (!config) {
      const serviceName = process.env.S3_SERVICE_NAME?.trim();
      if (
        serviceName?.startsWith('com.mendix.storage.') &&
        serviceName !== 'com.mendix.storage.s3'
      ) {
        this.logger.warn(
          `Storage service "${serviceName}" is not S3. Image uploads will use local in-memory storage.`,
        );
        return;
      }

      this.logger.warn(
        'S3 is not configured (S3_* env vars missing). Image uploads will use local in-memory storage.',
      );
      return;
    }

    this.config = config;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    try {
      await this.verifyConnection(config);
      this.available = true;
      const location = config.prefix
        ? `${config.bucket}/${config.prefix}`
        : config.bucket;
      this.logger.log(
        `S3 connection established (bucket: ${location}, region: ${config.region})`,
      );
    } catch (error) {
      this.available = false;
      this.client = null;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `S3 connection failed. Image uploads will use local in-memory storage. Reason: ${message}`,
      );
    }
  }

  async uploadUserImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ imageUrl: string; imageKey: string }> {
    if (!this.client || !this.available || !this.config) {
      throw new Error('S3 is not available');
    }

    const extension =
      extname(file.originalname) || this.extensionFromMime(file.mimetype);
    const relativeKey = `users/${userId}/${randomUUID()}${extension}`;
    const imageKey = this.config.prefix
      ? `${this.config.prefix}/${relativeKey}`
      : relativeKey;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: imageKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      imageKey,
      imageUrl: this.buildPublicUrl(imageKey),
    };
  }

  async deleteObject(imageKey: string | null | undefined): Promise<void> {
    if (
      !imageKey ||
      !this.client ||
      !this.available ||
      !this.config?.performDelete
    ) {
      return;
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: imageKey,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to delete S3 object "${imageKey}": ${message}`);
    }
  }

  private async verifyConnection(config: S3RuntimeConfig): Promise<void> {
    if (!this.client) {
      throw new Error('S3 client was not created');
    }

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: config.bucket }));
      return;
    } catch (headError) {
      // Some S3-compatible providers deny HeadBucket but allow list/put.
      await this.client.send(
        new ListObjectsV2Command({
          Bucket: config.bucket,
          Prefix: config.prefix ? `${config.prefix}/` : undefined,
          MaxKeys: 1,
        }),
      );

      const message =
        headError instanceof Error ? headError.message : String(headError);
      this.logger.debug(
        `HeadBucket failed but ListObjects succeeded (${message})`,
      );
    }
  }

  private buildPublicUrl(imageKey: string): string {
    if (!this.config) {
      return imageKey;
    }

    const encodedKey = imageKey
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');

    if (this.config.forcePathStyle) {
      return `${this.config.endpoint}/${this.config.bucket}/${encodedKey}`;
    }

    try {
      const url = new URL(this.config.endpoint);
      return `${url.protocol}//${this.config.bucket}.${url.host}/${encodedKey}`;
    } catch {
      return `${this.config.endpoint}/${this.config.bucket}/${encodedKey}`;
    }
  }

  private extensionFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    return map[mimeType] ?? '.bin';
  }
}

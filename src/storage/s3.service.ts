import {
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { hasS3Config, parseBooleanEnv } from '../config/env';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client | null = null;
  private available = false;
  private bucket = '';
  private endpoint = '';
  private performDelete = false;

  isAvailable(): boolean {
    return this.available;
  }

  async onModuleInit(): Promise<void> {
    if (!hasS3Config()) {
      this.logger.warn(
        'S3 is not configured (S3_* env vars missing). Image uploads will use local in-memory storage.',
      );
      return;
    }

    this.bucket = process.env.S3_BUCKET_NAME!;
    this.endpoint = process.env.S3_ENDPOINT!.replace(/\/$/, '');
    this.performDelete = parseBooleanEnv(process.env.S3_PERFORM_DELETE);
    const region = process.env.S3_SERVICE_NAME || 'us-east-1';

    this.client = new S3Client({
      region,
      endpoint: this.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.available = true;
      this.logger.log(`S3 connection established (bucket: ${this.bucket})`);
    } catch (error) {
      this.available = false;
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
    if (!this.client || !this.available) {
      throw new Error('S3 is not available');
    }

    const extension =
      extname(file.originalname) || this.extensionFromMime(file.mimetype);
    const imageKey = `users/${userId}/${randomUUID()}${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: imageKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      imageKey,
      imageUrl: `${this.endpoint}/${this.bucket}/${imageKey}`,
    };
  }

  async deleteObject(imageKey: string | null | undefined): Promise<void> {
    if (!imageKey || !this.client || !this.available || !this.performDelete) {
      return;
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: imageKey,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to delete S3 object "${imageKey}": ${message}`);
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

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ensureDatabaseUrl, isDatabaseConfigured } from '../config/env';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private available = false;

  constructor() {
    ensureDatabaseUrl();
    super();
  }

  isAvailable(): boolean {
    return this.available;
  }

  async onModuleInit(): Promise<void> {
    if (!isDatabaseConfigured()) {
      this.logger.warn(
        'Database is not configured (POSTGRES_* env vars missing). Falling back to in-memory users store.',
      );
      return;
    }

    try {
      await this.$connect();
      await this.$queryRaw`SELECT 1`;
      this.available = true;
      this.logger.log('Database connection established');
    } catch (error) {
      this.available = false;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Database connection failed. Falling back to in-memory users store. Reason: ${message}`,
      );
      try {
        await this.$disconnect();
      } catch {
        // ignore disconnect errors when connection never succeeded
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.available) {
      await this.$disconnect();
    }
  }
}

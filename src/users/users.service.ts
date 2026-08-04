import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { User as PrismaUser } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../storage/s3.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

type MemoryUser = User & { imageKey: string | null };

export type UserImagePayload = {
  body: Readable | Buffer;
  contentType: string;
  contentLength?: number;
};

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);
  private readonly memoryUsers: MemoryUser[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      imageUrl: null,
      imageKey: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Grace Hopper',
      email: 'grace@example.com',
      imageUrl: null,
      imageKey: null,
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  onModuleInit(): void {
    if (this.prisma.isAvailable()) {
      this.logger.log('Users CRUD is using PostgreSQL via Prisma');
    } else {
      this.logger.warn('Users CRUD is using in-memory store');
    }

    if (this.s3.isAvailable()) {
      this.logger.log('User images are using S3 storage');
    } else {
      this.logger.warn('User images are using in-memory data URLs');
    }
  }

  async findAll(): Promise<User[]> {
    if (this.prisma.isAvailable()) {
      const users = await this.prisma.user.findMany({
        orderBy: { createdAt: 'asc' },
      });
      return users.map((user) => this.toUser(user));
    }

    return this.memoryUsers.map((user) => this.toUser(user));
  }

  async findOne(id: string): Promise<User> {
    if (this.prisma.isAvailable()) {
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new NotFoundException(`User with id "${id}" not found`);
      }
      return this.toUser(user);
    }

    return this.toUser(this.findMemoryUser(id));
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    if (this.prisma.isAvailable()) {
      const user = await this.prisma.user.create({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
        },
      });
      return this.toUser(user);
    }

    const now = new Date().toISOString();
    const user: MemoryUser = {
      id: randomUUID(),
      name: createUserDto.name,
      email: createUserDto.email,
      imageUrl: null,
      imageKey: null,
      createdAt: now,
      updatedAt: now,
    };
    this.memoryUsers.push(user);
    return this.toUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    if (this.prisma.isAvailable()) {
      await this.ensureDbUser(id);
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          name: updateUserDto.name,
          email: updateUserDto.email,
        },
      });
      return this.toUser(user);
    }

    const user = this.findMemoryUser(id);
    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name;
    }
    if (updateUserDto.email !== undefined) {
      user.email = updateUserDto.email;
    }
    user.updatedAt = new Date().toISOString();
    return this.toUser(user);
  }

  async updateImage(id: string, file?: Express.Multer.File): Promise<User> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are allowed');
    }

    if (this.prisma.isAvailable()) {
      const existing = await this.ensureDbUser(id);
      const uploaded = await this.storeImage(id, file, existing.imageKey);

      const user = await this.prisma.user.update({
        where: { id },
        data: {
          imageUrl: uploaded.imageUrl,
          imageKey: uploaded.imageKey,
        },
      });
      return this.toUser(user);
    }

    const user = this.findMemoryUser(id);
    const uploaded = await this.storeImage(id, file, user.imageKey);
    user.imageUrl = uploaded.imageUrl;
    user.imageKey = uploaded.imageKey;
    user.updatedAt = new Date().toISOString();
    return this.toUser(user);
  }

  async getImage(id: string): Promise<UserImagePayload> {
    if (this.prisma.isAvailable()) {
      const user = await this.ensureDbUser(id);
      if (user.imageKey && this.s3.isAvailable()) {
        return this.s3.getObject(user.imageKey);
      }
      return this.payloadFromDataUrl(user.imageUrl);
    }

    const user = this.findMemoryUser(id);
    if (user.imageKey && this.s3.isAvailable()) {
      return this.s3.getObject(user.imageKey);
    }
    return this.payloadFromDataUrl(user.imageUrl);
  }

  async remove(id: string): Promise<User> {
    if (this.prisma.isAvailable()) {
      const existing = await this.ensureDbUser(id);
      await this.s3.deleteObject(existing.imageKey);
      const user = await this.prisma.user.delete({ where: { id } });
      return this.toUser(user);
    }

    const index = this.memoryUsers.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    const [user] = this.memoryUsers.splice(index, 1);
    await this.s3.deleteObject(user.imageKey);
    return this.toUser(user);
  }

  private async storeImage(
    userId: string,
    file: Express.Multer.File,
    previousKey: string | null | undefined,
  ): Promise<{ imageUrl: string; imageKey: string | null }> {
    if (this.s3.isAvailable()) {
      const uploaded = await this.s3.uploadUserImage(userId, file);
      if (previousKey && previousKey !== uploaded.imageKey) {
        await this.s3.deleteObject(previousKey);
      }
      return uploaded;
    }

    return {
      imageKey: null,
      imageUrl: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
    };
  }

  private payloadFromDataUrl(imageUrl: string | null): UserImagePayload {
    if (!imageUrl?.startsWith('data:')) {
      throw new NotFoundException('User image not found');
    }

    const match = /^data:([^;]+);base64,(.+)$/.exec(imageUrl);
    if (!match) {
      throw new NotFoundException('User image not found');
    }

    const body = Buffer.from(match[2], 'base64');
    return {
      body,
      contentType: match[1],
      contentLength: body.length,
    };
  }

  private async ensureDbUser(id: string): Promise<PrismaUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return user;
  }

  private findMemoryUser(id: string): MemoryUser {
    const user = this.memoryUsers.find((item) => item.id === id);
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return user;
  }

  private toUser(
    user: PrismaUser | MemoryUser | (User & { imageKey?: string | null }),
  ): User {
    const createdAt =
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : user.createdAt;
    const updatedAt =
      user.updatedAt instanceof Date
        ? user.updatedAt.toISOString()
        : user.updatedAt;

    const imageKey = 'imageKey' in user ? (user.imageKey ?? null) : null;
    const imageUrl = imageKey
      ? `/api/users/${user.id}/image?v=${encodeURIComponent(updatedAt)}`
      : (user.imageUrl ?? null);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      imageUrl,
      createdAt,
      updatedAt,
    };
  }
}

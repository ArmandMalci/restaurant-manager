import { Injectable, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  public constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);

    super({ adapter });
  }

  public async onModuleInit() {
    // Skip DB connection during OpenAPI spec generation (no real DB available).
    // Real connection failures surface via the health-check endpoint at runtime.
    if (process.env.DATABASE_URL?.includes('placeholder')) return;
    await this.$connect();
  }
}

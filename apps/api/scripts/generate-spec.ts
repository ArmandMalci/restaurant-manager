/**
 * Generates openapi.json without starting the HTTP server or needing real secrets.
 * Runs against the compiled dist/ output (which has emitDecoratorMetadata applied
 * by the TypeScript compiler) — tsx/esbuild does not support emitDecoratorMetadata.
 * Usage: pnpm gen:spec  (outputs openapi.json to apps/web/)
 */

// Inject minimal env before modules load
process.env.JWT_SECRET ??= 'gen-spec-placeholder';
process.env.JWT_REFRESH_SECRET ??= 'gen-spec-placeholder-refresh';
process.env.DATABASE_URL ??= 'postgresql://localhost/placeholder';

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';
// Load compiled AppModule (has correct decorator metadata from tsc)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AppModule } = require('../dist/app.module');

/**
 * nestjs-zod v5 + Zod v4 generates OpenAPI 3.1 syntax for:
 *   - nullable: anyOf [{...}, {type:'null'}] instead of {nullable:true}
 *   - exclusiveMinimum: number instead of boolean + minimum
 * Orval's spec validator crashes on these. Walk the spec and downgrade to 3.0.
 */
function toOpenApi30(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toOpenApi30);
  if (!value || typeof value !== 'object') return value;
  const obj = value as Record<string, unknown>;

  // anyOf nullable → nullable:true
  if (Array.isArray(obj.anyOf) && obj.anyOf.length === 2) {
    const nullIdx = obj.anyOf.findIndex((s: unknown) => (s as Record<string, unknown>)?.type === 'null');
    if (nullIdx !== -1) {
      const other = toOpenApi30(obj.anyOf[1 - nullIdx]) as Record<string, unknown>;
      const { anyOf: _anyOf, ...rest } = obj;
      return toOpenApi30({ ...rest, ...other, nullable: true });
    }
  }

  // exclusiveMinimum as number → boolean form + minimum
  if (typeof obj.exclusiveMinimum === 'number') {
    const { exclusiveMinimum, ...rest } = obj;
    return toOpenApi30({ ...rest, minimum: exclusiveMinimum, exclusiveMinimum: true });
  }

  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toOpenApi30(v)]));
}

async function generate() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: false,
  });
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Restaurant Manager API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const normalized = toOpenApi30(document);
  const outPath = join(__dirname, '..', '..', 'web', 'openapi.json');
  writeFileSync(outPath, JSON.stringify(normalized, null, 2));
  console.log(`OpenAPI spec written to ${outPath}`);
  await app.close();
}

generate().catch((err) => {
  console.error('generate-spec failed:', err?.message || err);
  console.error(err?.stack || err);
  process.exit(1);
});

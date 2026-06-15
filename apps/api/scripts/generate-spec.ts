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
  const outPath = join(__dirname, '..', '..', 'web', 'openapi.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2));
  console.log(`OpenAPI spec written to ${outPath}`);
  await app.close();
}

generate().catch((err) => {
  console.error('generate-spec failed:', err?.message || err);
  process.exit(1);
});

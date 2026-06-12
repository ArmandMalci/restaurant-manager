/**
 * Generates openapi.json without starting the HTTP server or needing real secrets.
 * Usage: pnpm gen:spec  (outputs openapi.json in this directory)
 */
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { writeFileSync } from 'fs'
import { join } from 'path'

// Inject minimal env before modules load
process.env.JWT_SECRET ??= 'gen-spec-placeholder'
process.env.JWT_REFRESH_SECRET ??= 'gen-spec-placeholder-refresh'
process.env.DATABASE_URL ??= 'postgresql://localhost/placeholder'

import { AppModule } from '../src/app.module'

async function generate() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  )
  app.setGlobalPrefix('api')

  const config = new DocumentBuilder()
    .setTitle('Restaurant Manager API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  const outPath = join(__dirname, '..', '..', 'web', 'openapi.json')
  writeFileSync(outPath, JSON.stringify(document, null, 2))
  console.log(`OpenAPI spec written to ${outPath}`)
  await app.close()
}

generate().catch(console.error)

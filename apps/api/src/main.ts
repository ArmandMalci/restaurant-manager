import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import fastifyCookie from '@fastify/cookie'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV !== 'test' }),
  )
  await app.register(fastifyCookie)
  app.setGlobalPrefix('api')
  app.enableCors({ origin: 'http://localhost:5173', credentials: true })

  try {
    const config = new DocumentBuilder()
      .setTitle('Restaurant Manager API')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/openapi.json',
    })
  } catch (e) {
    // nestjs-zod + Zod v4 z.date() fields can't be serialized to JSON Schema
    console.warn('Swagger setup skipped:', (e as Error).message)
  }

  const port = process.env.PORT ?? 3001
  await app.listen(port, '0.0.0.0')
  console.log(`API running on http://localhost:${port}/api`)
  console.log(`OpenAPI spec: http://localhost:${port}/api/openapi.json`)
}
bootstrap()

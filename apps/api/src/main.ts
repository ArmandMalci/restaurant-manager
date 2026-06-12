import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import fastifyCookie from '@fastify/cookie'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV !== 'test' }),
  )
  await app.register(fastifyCookie)
  app.setGlobalPrefix('api')
  app.enableCors({ origin: 'http://localhost:5173', credentials: true })
  const port = process.env.PORT ?? 3001
  await app.listen(port, '0.0.0.0')
  console.log(`API running on http://localhost:${port}/api`)
}
bootstrap()

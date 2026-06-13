import { createZodDto } from 'nestjs-zod'
import { SubscribeSchema } from '@restaurant/shared'

export class SubscribeDtoClass extends createZodDto(SubscribeSchema) {}

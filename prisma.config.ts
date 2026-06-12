import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrate: {
    async adapter(env) {
      const pool = new Pool({ connectionString: env.DATABASE_URL })
      return new PrismaPg(pool)
    },
  },
})

import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: {
      target: 'http://localhost:3001/api/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './src/api',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/lib/api-client.ts',
          name: 'default',
        },
      },
    },
  },
})

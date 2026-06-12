import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: {
      target: './openapi.json',
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

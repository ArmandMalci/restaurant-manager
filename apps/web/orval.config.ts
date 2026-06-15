import { defineConfig } from 'orval';

// biome-ignore lint/style/noDefaultExport: Orval requires default export
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
        query: {
          signal: true,
          // Generates getXxxQueryKey() factories alongside every hook.
          // Use these for cache invalidation:
          //   queryClient.invalidateQueries({ queryKey: getMenuControllerGetCategoriesQueryKey() })
          // No boilerplate needed at the call site — import key + call invalidateQueries.
          // staleTime is set globally in queryClient defaultOptions, not here (query.options is deprecated in Orval v7+).
        },
      },
    },
  },
});

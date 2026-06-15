import { defineConfig } from "orval";

// biome-ignore lint/style/noDefaultExport: Orval requires default export
export default defineConfig({
  api: {
    input: {
      target: "./openapi.json",
    },
    output: {
      mode: "tags-split",
      target: "./src/api",
      client: "react-query",
      httpClient: "axios",
      // Remove stale generated files when endpoints are renamed or deleted
      clean: true,
      // Format generated files with biome (src/api is now included in biome.json)
      formatter: "biome",
      override: {
        mutator: {
          path: "./src/lib/api-client.ts",
          name: "customInstance",
        },
        query: {
          // Default Orval behavior: GET → useQuery hooks, POST/PUT/PATCH/DELETE → useMutation hooks.
          // DO NOT set useQuery/useMutation globally — doing so applies them to ALL methods,
          // causing PATCH/DELETE to generate query hooks and GET to generate mutation hooks.

          // AbortSignal forwarded to every request for cancellation on unmount
          signal: true,
          // Export getXxxQueryKey() factories:
          //   queryClient.invalidateQueries({ queryKey: getMenuControllerGetCategoriesQueryKey() })
          shouldExportQueryKey: true,
          // Export useInvalidateXxx() hooks — ergonomic shorthand at the call site
          useInvalidate: true,
          // Keep internal axios mutator hooks private — callers use the typed React hooks
          shouldExportMutatorHooks: false,
          // No paginated endpoints — skip useInfiniteXxx() generation
          useInfinite: false,
        },
      },
    },
  },
});

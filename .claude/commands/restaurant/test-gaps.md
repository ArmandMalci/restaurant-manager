Find untested or undertested code in the restaurant-manager codebase and write test skeletons for the gaps found.

## What to analyse

1. Run coverage for the API:
```bash
pnpm --filter @restaurant/api test --coverage
```

2. Look for service methods with no corresponding `it()` block in the spec file.
3. Look for error paths (try/catch, conditional returns) with no test covering the failure case.
4. Check that every controller action has at least an integration test or a service-level unit test.

## Output format

For each gap found, provide:

```typescript
// File: apps/api/src/<module>/<module>.service.spec.ts
// Gap: <method name> — <what's missing>
it('<what it should test>', async () => {
  // Arrange
  mockPrisma.<model>.<method>.mockRejectedValue(new Error('DB failure'))
  // Act & Assert
  await expect(service.<method>(<args>)).rejects.toThrow('DB failure')
})
```

List gaps in priority order: CRITICAL (untested public API surface) → WARNING (untested error paths) → INFO (edge cases).

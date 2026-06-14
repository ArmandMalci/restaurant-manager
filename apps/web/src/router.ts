import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import type { AuthUser } from './stores/auth.store';

export interface RouterContext {
  auth: {
    isAuthenticated: boolean;
    user: AuthUser | null;
  };
}

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

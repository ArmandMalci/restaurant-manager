import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Outlet />
    </div>
  ),
});

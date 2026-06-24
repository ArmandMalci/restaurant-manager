import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/staff/')({
  beforeLoad: () => {
    throw redirect({ to: '/settings' });
  },
  component: () => null,
});

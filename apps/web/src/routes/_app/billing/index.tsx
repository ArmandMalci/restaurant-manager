import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/billing/')({
  beforeLoad: () => {
    throw redirect({ to: '/checkout' });
  },
  component: () => null,
});

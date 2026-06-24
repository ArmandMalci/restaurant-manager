import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/orders/')({
  beforeLoad: () => {
    throw redirect({ to: '/order' });
  },
  component: () => null,
});

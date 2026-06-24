import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/reservations/')({
  beforeLoad: () => {
    throw redirect({ to: '/door' });
  },
  component: () => null,
});

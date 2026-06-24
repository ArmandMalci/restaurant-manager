import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/tables/')({
  beforeLoad: () => {
    throw redirect({ to: '/floor' });
  },
  component: () => null,
});

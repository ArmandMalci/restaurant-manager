import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthUser } from '@/stores/auth.store';

export const Route = createFileRoute('/_auth/login')({
  component: LoginPage,
});

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      apiClient.post<LoginResponse>('/auth/login', creds).then((r) => r.data),
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken);
      router.navigate({ to: '/dashboard' });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Restaurant Manager</h1>
        <p className="text-muted-foreground text-sm">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-background ring-ring/50 placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
            placeholder="admin@restaurant.local"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-background ring-ring/50 placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
          />
        </div>

        {login.isError && (
          <p className="text-destructive text-sm">
            {(login.error as Error)?.message ?? 'Invalid credentials'}
          </p>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { useAuthControllerLogin } from '@/api/auth/auth';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthUser } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';

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

  const login = useAuthControllerLogin({
    mutation: {
      onSuccess: (data) => {
        const { user, accessToken } = data as unknown as LoginResponse;

        setAuth(user, accessToken);
        router.navigate({ to: '/service' });
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login.mutate({ data: { email, password } });
  }

  return (
    <div className="w-full max-w-md px-4">
      {/* Brand mark */}
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="bg-accent text-accent-foreground flex h-12 w-12 items-center justify-center rounded-xl shadow-sm">
          <UtensilsCrossed className="size-6" />
        </div>
        <div className="space-y-1 text-center">
          <h1 className="text-foreground text-2xl font-bold tracking-tight">RestoManager</h1>
          <p className="text-muted-foreground text-sm">Sign in to manage your restaurant</p>
        </div>
      </div>

      {/* Card */}
      <div className="bg-card border-border rounded-xl border px-8 py-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-foreground block text-sm font-medium">
              Work Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@restaurant.local"
              disabled={login.isPending}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-foreground block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={login.isPending}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Error state */}
          {login.isError && (
            <div className="bg-destructive/10 border-destructive/20 rounded-lg border px-3 py-2.5">
              <p className="text-destructive text-sm font-medium">
                {(login.error as Error)?.message ?? 'Invalid credentials. Please try again.'}
              </p>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={login.isPending}
            className="bg-accent text-accent-foreground hover:bg-accent/90 mt-2 h-10 w-full rounded-lg text-sm font-medium transition-colors"
          >
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>

      {/* Footer note */}
      <p className="text-muted-foreground mt-6 text-center text-xs">
        Access restricted to authorized staff only.
      </p>
    </div>
  );
}

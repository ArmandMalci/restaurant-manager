import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { useAuthControllerLogin } from '@/api/auth/auth';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthUser } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
    /* Full-viewport breakout — escapes the parent _auth flex centering at lg+ */
    <div className="fixed inset-0 flex flex-col lg:grid lg:grid-cols-2">
      {/* Brand panel — warm, terracotta */}
      <div className="bg-sidebar text-sidebar-foreground hidden flex-col items-center justify-center gap-8 px-16 lg:flex">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="bg-sidebar-foreground/10 flex h-16 w-16 items-center justify-center rounded-2xl ring-1 ring-sidebar-foreground/20">
            <UtensilsCrossed className="text-sidebar-foreground size-8" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-4xl font-semibold tracking-tight">RestoManager</h1>
            <p className="text-sidebar-foreground/70 text-base">
              Your restaurant, running like clockwork.
            </p>
          </div>
        </div>
        <p className="text-sidebar-foreground/40 absolute bottom-6 text-xs">
          Access restricted to authorized staff only.
        </p>
      </div>

      {/* Sign-in panel */}
      <div className="bg-background flex flex-col items-center justify-center px-6 py-12 lg:px-16">
        {/* Mobile brand mark — only visible below lg */}
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <div className="bg-sidebar text-sidebar-foreground flex h-12 w-12 items-center justify-center rounded-xl">
            <UtensilsCrossed className="size-6" />
          </div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">RestoManager</h2>
        </div>

        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>Enter your work credentials to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@restaurant.local"
                  disabled={login.isPending}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={login.isPending}
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

              {/* Submit — single primary CTA */}
              <Button type="submit" disabled={login.isPending} className="mt-1 h-10 w-full">
                {login.isPending ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Mobile footer */}
        <p className="text-muted-foreground mt-6 text-center text-xs lg:hidden">
          Access restricted to authorized staff only.
        </p>
      </div>
    </div>
  );
}

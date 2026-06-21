import { useRouter } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { authControllerLogout } from '@/api/auth/auth';

export function Topbar() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  async function handleLogout() {
    try {
      await authControllerLogout();
    } finally {
      clearAuth();
      router.navigate({ to: '/login' });
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div />
      <div className="flex items-center gap-3">
        {user && <span className="text-muted-foreground text-sm">{user.email}</span>}
        <button
          type="button"
          onClick={handleLogout}
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}

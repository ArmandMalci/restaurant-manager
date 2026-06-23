import { useEffect, useRef, type ReactNode } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { OfflineBanner } from '../offline-banner';
import { useOnline } from '@/hooks/use-online';
import { drainQueue } from '@/lib/offline-queue';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isOnline = useOnline();
  const prevOnline = useRef(isOnline);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!prevOnline.current && isOnline) {
      // biome-ignore lint/suspicious/noConsole: error reporting for offline queue drain
      drainQueue().catch(console.error);
    }
    prevOnline.current = isOnline;
  }, [isOnline]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        {!isOnline && <OfflineBanner />}
        <main className="flex-1 overflow-y-auto">
          <div key={pathname} className="animate-page-in h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

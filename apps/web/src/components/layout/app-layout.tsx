import { useEffect, useRef, type ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { OfflineBanner } from '../offline-banner'
import { useOnline } from '@/hooks/use-online'
import { drainQueue } from '@/lib/offline-queue'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const isOnline = useOnline()
  const prevOnline = useRef(isOnline)

  useEffect(() => {
    if (!prevOnline.current && isOnline) {
      drainQueue().catch(console.error)
    }
    prevOnline.current = isOnline
  }, [isOnline])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        {!isOnline && <OfflineBanner />}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}

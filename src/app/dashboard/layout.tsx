// ============================================
// src/app/dashboard/layout.tsx
// Version: 20260124
// UI-025: Added ToastProvider for success/error notifications
// ============================================

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'
import { ClientProviders } from '@/components/ClientProviders'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <ClientProviders>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </ClientProviders>
  )
}
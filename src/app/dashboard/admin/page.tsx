// ================================================
// WDI ERP - Admin Console Page
// Version: 20260202-RBAC-V2-PHASE6
// RBAC v2: Permission-based admin gating (DOC-016 §6.1, FP-002)
// ================================================
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePageView } from '@/hooks/useActivityLog'
import { Users, Activity, BarChart3, Shield, Upload, GitMerge, Loader2 } from 'lucide-react'
import { canAccessAdmin } from '@/lib/ui-permissions'
import NoAccessPage from '@/components/NoAccessPage'

export default function AdminConsolePage() {
  const { data: session, status } = useSession()
  usePageView('admin')
  const router = useRouter()

  // RBAC v2 / Phase 6: Permission-based admin gating
  const permissions = (session?.user as any)?.permissions as string[] | undefined
  const hasAdminAccess = canAccessAdmin(permissions)

  useEffect(() => {
    if (status === 'authenticated' && !hasAdminAccess) {
      router.push('/dashboard')
    }
  }, [status, hasAdminAccess, router])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">טוען...</p>
        </div>
      </div>
    )
  }

  if (!hasAdminAccess) {
    return <NoAccessPage />
  }

  const cards = [
    {
      title: 'ניהול משתמשים',
      description: 'הוספה, עריכה והגדרת הרשאות למשתמשי המערכת',
      icon: Users,
      href: '/dashboard/admin/users',
      color: 'bg-blue-500',
      ready: true,
    },
    {
      title: 'יומן פעילות',
      description: 'צפייה בכל הפעולות שבוצעו במערכת',
      icon: Activity,
      href: '/dashboard/admin/logs',
      color: 'bg-green-500',
      ready: true,
    },
    {
      title: 'ייבוא אנשי קשר',
      description: 'ייבוא חכם של ארגונים ואנשי קשר מרשימות',
      icon: Upload,
      href: '/dashboard/admin/import-contacts',
      color: 'bg-teal-500',
      ready: true,
    },
    {
      title: 'ניהול כפילויות',
      description: 'זיהוי ומיזוג רשומות כפולות בארגונים ואנשי קשר',
      icon: GitMerge,
      href: '/dashboard/admin/duplicates',
      color: 'bg-orange-500',
      ready: true,
    },
    {
      title: 'תפקידים והרשאות',
      description: 'סקירת תפקידים והרשאות גישה',
      icon: Shield,
      href: '/dashboard/admin/roles',
      color: 'bg-purple-500',
      ready: true,
    },
    {
      title: 'אנליטיקות',
      description: 'סטטיסטיקות ודוחות שימוש',
      icon: BarChart3,
      href: '/dashboard/admin/analytics',
      color: 'bg-pink-500',
      ready: false,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Console</h1>
        <p className="text-gray-500">ניהול המערכת והרשאות</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon
          return card.ready ? (
            <Link
              key={card.title}
              href={card.href}
              className="card p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="text-white" size={24} />
              </div>
              <h2 className="text-lg font-semibold mb-2">{card.title}</h2>
              <p className="text-gray-500 text-sm">{card.description}</p>
            </Link>
          ) : (
            <div
              key={card.title}
              className="card p-6 opacity-50 cursor-not-allowed"
            >
              <div className={`w-12 h-12 bg-gray-300 rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="text-white" size={24} />
              </div>
              <h2 className="text-lg font-semibold mb-2">{card.title}</h2>
              <p className="text-gray-500 text-sm">{card.description}</p>
              <span className="text-xs text-gray-400 mt-2 block">בקרוב</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

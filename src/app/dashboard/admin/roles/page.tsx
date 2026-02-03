// ================================================
// WDI ERP - Admin Roles Overview Page
// Version: 20260202-RBAC-V2-PHASE6
// RBAC v2: Permission-based admin gating (DOC-016 §6.1, FP-002)
// ================================================

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { usePageView } from '@/hooks/useActivityLog'
import { Shield, Loader2, Info, Users } from 'lucide-react'
import { AdminPageHeader, RoleCard } from '@/components/admin'
import { canAccessAdmin } from '@/lib/ui-permissions'
import NoAccessPage from '@/components/NoAccessPage'

// ================================================
// TYPES
// ================================================

interface Role {
  id: string
  name: string
  displayName: string
  description?: string
  level: number
  userCount: number
}

// ================================================
// COMPONENT
// ================================================

export default function AdminRolesPage() {
  const { data: session, status } = useSession()
  usePageView('admin')
  const router = useRouter()

  // State
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  // RBAC v2 / Phase 6: Permission-based admin gating
  const permissions = (session?.user as any)?.permissions as string[] | undefined
  const hasAdminAccess = canAccessAdmin(permissions)

  // Redirect if not authorized
  useEffect(() => {
    if (status === 'authenticated' && !hasAdminAccess) {
      router.push('/dashboard')
    }
  }, [status, hasAdminAccess, router])

  // Fetch roles
  useEffect(() => {
    if (hasAdminAccess) {
      fetchRoles()
    }
  }, [hasAdminAccess])

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles')
      if (res.ok) {
        const data = await res.json()
        setRoles(data.roles || [])
      }
    } catch (err) {
      console.error('Failed to fetch roles')
    } finally {
      setLoading(false)
    }
  }

  // Stats
  const totalUsers = roles.reduce((sum, r) => sum + r.userCount, 0)
  const rolesWithUsers = roles.filter((r) => r.userCount > 0).length

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">טוען תפקידים...</p>
        </div>
      </div>
    )
  }

  // Unauthorized state
  if (!hasAdminAccess) {
    return <NoAccessPage />
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <AdminPageHeader
        title="תפקידים והרשאות"
        description="סקירת התפקידים המוגדרים במערכת והרשאותיהם"
        backHref="/dashboard/admin"
        backLabel="חזרה לניהול מערכת"
      />

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800">
            התפקידים במערכת מוגדרים מראש ואינם ניתנים לעריכה.
          </p>
          <p className="text-sm text-blue-700 mt-1">
            להקצאת תפקיד למשתמש, עבור ל
            <a href="/dashboard/admin/users" className="underline hover:no-underline mx-1">
              ניהול משתמשים
            </a>
            .
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-3xl font-bold text-gray-900">{roles.length}</div>
          <div className="text-sm text-gray-500">תפקידים מוגדרים</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-3xl font-bold text-blue-600">{rolesWithUsers}</div>
          <div className="text-sm text-gray-500">תפקידים בשימוש</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-3xl font-bold text-emerald-600">{totalUsers}</div>
          <div className="text-sm text-gray-500">הקצאות תפקידים</div>
        </div>
      </div>

      {/* Roles Grid */}
      {roles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">אין תפקידים</h3>
          <p className="text-gray-500 text-sm">לא נמצאו תפקידים במערכת</p>
        </div>
      )}
    </div>
  )
}

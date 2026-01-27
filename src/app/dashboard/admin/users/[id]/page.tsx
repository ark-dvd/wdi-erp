// ================================================
// WDI ERP - Admin User Detail Page
// Version: 20260125-MAYBACH
// Maybach-grade UI per Design Document
// ================================================

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { usePageView } from '@/hooks/useActivityLog'
import {
  User as UserIcon,
  Shield,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  Check,
  Info,
} from 'lucide-react'
import {
  AdminPageHeader,
  UserAccessBadge,
  getAccessLevel,
  ConfirmDialog,
  EffectivePermissionsTable,
} from '@/components/admin'

// ================================================
// TYPES
// ================================================

interface Role {
  id: string
  name: string
  displayName: string
  description?: string
  level: number
}

interface Permission {
  module: string
  action: string
  scope: string
}

interface UserDetail {
  id: string
  email: string
  name: string | null
  isActive: boolean
  lastLogin: string | null
  roles: Role[]
  permissions: Permission[]
  employee: {
    firstName: string
    lastName: string
    role: string
    photoUrl?: string | null
  } | null
}

// ================================================
// CONSTANTS
// ================================================

// RBAC admin roles that can access this page (DOC-013 §10.2)
const RBAC_ADMIN_ROLES = ['owner', 'trust_officer']

// Role colors for badges
const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800 border-purple-200',
  executive: 'bg-red-100 text-red-800 border-red-200',
  trust_officer: 'bg-blue-100 text-blue-800 border-blue-200',
  pmo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  finance_officer: 'bg-green-100 text-green-800 border-green-200',
  domain_head: 'bg-orange-100 text-orange-800 border-orange-200',
  project_manager: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  project_coordinator: 'bg-teal-100 text-teal-800 border-teal-200',
  administration: 'bg-gray-100 text-gray-700 border-gray-200',
  all_employees: 'bg-slate-100 text-slate-600 border-slate-200',
}

// ================================================
// COMPONENT
// ================================================

export default function AdminUserDetailPage() {
  // Fix: use useParams() instead of use(params) for client components
  const params = useParams()
  const userId = (params?.id as string) || ''
  const { data: session, status } = useSession()
  usePageView('admin')
  const router = useRouter()

  // State
  const [user, setUser] = useState<UserDetail | null>(null)
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action states
  const [addingRole, setAddingRole] = useState(false)
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<string>('')
  const [removingRoleId, setRemovingRoleId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Confirmation dialogs
  const [confirmRemoveRole, setConfirmRemoveRole] = useState<Role | null>(null)
  const [confirmToggleActive, setConfirmToggleActive] = useState(false)

  // RBAC v1: Check admin access (both roles array and role string)
  const currentUserId = (session?.user as any)?.id
  const userRoles = (session?.user as any)?.roles || []
  const userRoleNames: string[] = userRoles.map((r: { name: string }) => r?.name).filter(Boolean)
  const primaryRole = (session?.user as any)?.role

  const canManageRoles =
    userRoleNames.some((r: string) => RBAC_ADMIN_ROLES.includes(r)) ||
    (primaryRole ? RBAC_ADMIN_ROLES.includes(primaryRole) : false)
  const isOwner = userRoleNames.includes('owner') || primaryRole === 'owner'
  const isSelf = currentUserId === userId

  // Redirect if not authorized
  useEffect(() => {
    if (status === 'authenticated' && !canManageRoles) {
      router.push('/dashboard')
    }
  }, [status, canManageRoles, router])

  // Fetch data
  useEffect(() => {
    if (canManageRoles && userId) {
      fetchUser()
      fetchRoles()
    }
  }, [canManageRoles, userId])

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/admin/users/${userId}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('משתמש לא נמצא')
        } else {
          setError('שגיאה בטעינת נתוני המשתמש')
        }
        return
      }
      const data = await res.json()
      setUser(data)
    } catch (err) {
      console.error('Failed to fetch user:', err)
      setError('שגיאה בטעינת נתוני המשתמש')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles')
      if (res.ok) {
        const data = await res.json()
        setAllRoles(data.roles || [])
      }
    } catch (err) {
      console.error('Failed to fetch roles')
    }
  }

  // ================================================
  // ACTIONS
  // ================================================

  const handleAddRole = async () => {
    if (!selectedRoleToAdd || !user) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: selectedRoleToAdd }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'שגיאה בהוספת תפקיד')
        return
      }

      await fetchUser()
      setSelectedRoleToAdd('')
      setAddingRole(false)
    } catch (err) {
      console.error('Failed to add role:', err)
      alert('שגיאה בהוספת תפקיד')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveRole = async (role: Role) => {
    if (!user) return

    // Safety check: Cannot remove last owner role
    if (role.name === 'owner') {
      const ownerCount = allRoles.find((r) => r.name === 'owner')
      // This would need backend validation, but UI can show warning
    }

    setConfirmRemoveRole(role)
  }

  const confirmRemoveRoleAction = async () => {
    if (!confirmRemoveRole || !user) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/roles/${confirmRemoveRole.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'שגיאה בהסרת תפקיד')
        return
      }

      await fetchUser()
      setConfirmRemoveRole(null)
    } catch (err) {
      console.error('Failed to remove role:', err)
      alert('שגיאה בהסרת תפקיד')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleActive = async () => {
    if (!user) return

    // Safety check: Cannot deactivate self
    if (isSelf && user.isActive) {
      alert('לא ניתן להשבית את המשתמש שלך')
      return
    }

    setConfirmToggleActive(true)
  }

  const confirmToggleActiveAction = async () => {
    if (!user) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'שגיאה בעדכון סטטוס')
        return
      }

      await fetchUser()
      setConfirmToggleActive(false)
    } catch (err) {
      console.error('Failed to toggle active:', err)
      alert('שגיאה בעדכון סטטוס')
    } finally {
      setActionLoading(false)
    }
  }

  // ================================================
  // COMPUTED VALUES
  // ================================================

  const displayName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user?.name || user?.email?.split('@')[0] || ''

  const accessLevel = user ? getAccessLevel(user.roles) : 'none'

  // Roles user doesn't have yet (for add dropdown)
  const availableRolesToAdd = allRoles.filter(
    (role) =>
      role.name !== 'all_employees' &&
      !user?.roles.some((ur) => ur.id === role.id)
  )

  // Check if user has owner role
  const userHasOwnerRole = user?.roles.some((r) => r.name === 'owner')

  // Check if role can be removed
  const canRemoveRole = (role: Role): boolean => {
    // Cannot remove all_employees
    if (role.name === 'all_employees') return false

    // Trust Officer cannot modify Owner role
    if (role.name === 'owner' && !isOwner) return false

    return true
  }

  // Check if role can be added
  const canAddRole = (roleName: string): boolean => {
    // Trust Officer cannot add Owner role
    if (roleName === 'owner' && !isOwner) return false

    return true
  }

  // ================================================
  // LOADING & ERROR STATES
  // ================================================

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">טוען נתוני משתמש...</p>
        </div>
      </div>
    )
  }

  if (!canManageRoles) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">אין הרשאה</h2>
          <p className="text-gray-500">אין לך הרשאה לגשת לדף זה</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <AdminPageHeader
          title="פרטי משתמש"
          description=""
          backHref="/dashboard/admin/users"
          backLabel="חזרה לרשימת משתמשים"
        />
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">{error || 'משתמש לא נמצא'}</h3>
        </div>
      </div>
    )
  }

  // ================================================
  // RENDER
  // ================================================

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <AdminPageHeader
        title="פרטי משתמש"
        description=""
        backHref="/dashboard/admin/users"
        backLabel="חזרה לרשימת משתמשים"
      />

      {/* User Profile Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {user.employee?.photoUrl ? (
                <img
                  src={user.employee.photoUrl}
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <UserIcon className="w-10 h-10 text-gray-400" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
              <p className="text-gray-500 mt-1" dir="ltr">
                {user.email}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-sm text-gray-500">סטטוס:</span>
                {user.isActive ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    פעיל
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-red-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    מושבת
                  </span>
                )}
              </div>
            </div>

            {/* Access Badge */}
            <div className="flex-shrink-0">
              <UserAccessBadge accessLevel={accessLevel} />
            </div>
          </div>
        </div>
      </div>

      {/* Roles Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-400" />
            תפקידים
          </h3>
        </div>

        <div className="p-6">
          {/* Current Roles */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-3">תפקידים נוכחיים:</p>
            <div className="space-y-2">
              {user.roles.map((role) => {
                const canRemove = canRemoveRole(role)

                return (
                  <div
                    key={role.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      roleColors[role.name] || 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        <span className="font-medium">{role.displayName}</span>
                      </div>
                      {role.description && (
                        <p className="text-xs mt-1 opacity-75">{role.description}</p>
                      )}
                    </div>
                    {canRemove && (
                      <button
                        onClick={() => handleRemoveRole(role)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        הסר
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Add Role */}
          <div>
            <p className="text-sm text-gray-500 mb-3">הוספת תפקיד:</p>
            {availableRolesToAdd.length > 0 ? (
              <div className="flex items-center gap-3">
                <select
                  value={selectedRoleToAdd}
                  onChange={(e) => setSelectedRoleToAdd(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">בחר תפקיד להוספה...</option>
                  {availableRolesToAdd
                    .filter((role) => canAddRole(role.name))
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.displayName}
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleAddRole}
                  disabled={!selectedRoleToAdd || actionLoading}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  הוסף
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">למשתמש יש את כל התפקידים האפשריים</p>
            )}
          </div>
        </div>
      </div>

      {/* Effective Permissions Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">הרשאות אפקטיביות</h3>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <Info className="w-4 h-4" />
            צפייה בלבד – נגזר מהתפקידים שהוקצו
          </p>
        </div>

        <div className="p-6">
          <EffectivePermissionsTable permissions={user.permissions || []} />
        </div>
      </div>

      {/* Actions Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">פעולות</h3>
        </div>

        <div className="p-6">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            {user.isActive ? (
              <>
                <button
                  onClick={handleToggleActive}
                  disabled={isSelf}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PowerOff className="w-4 h-4" />
                  השבת משתמש
                </button>
                <p className="text-sm text-gray-500 mt-3">
                  השבתת משתמש תמנע ממנו גישה למערכת.
                  <br />
                  ניתן להפעיל מחדש בכל עת.
                </p>
                {isSelf && (
                  <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    לא ניתן להשבית את המשתמש שלך
                  </p>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleToggleActive}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Power className="w-4 h-4" />
                  הפעל משתמש
                </button>
                <p className="text-sm text-gray-500 mt-3">
                  הפעלת המשתמש תאפשר לו גישה למערכת בהתאם להרשאותיו.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={!!confirmRemoveRole}
        title="הסרת תפקיד"
        message={`האם להסיר את התפקיד "${confirmRemoveRole?.displayName}" מהמשתמש ${displayName}?`}
        warning={
          confirmRemoveRole?.name === 'owner'
            ? 'שים לב: הסרת תפקיד זה תבטל את הגישה המלאה למערכת.'
            : confirmRemoveRole?.name === 'trust_officer'
            ? 'שים לב: הסרת תפקיד זה תבטל את היכולת לנהל הרשאות.'
            : undefined
        }
        confirmLabel="הסר תפקיד"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={confirmRemoveRoleAction}
        onCancel={() => setConfirmRemoveRole(null)}
      />

      <ConfirmDialog
        isOpen={confirmToggleActive}
        title={user.isActive ? 'השבתת משתמש' : 'הפעלת משתמש'}
        message={
          user.isActive
            ? `האם להשבית את המשתמש ${displayName}?`
            : `האם להפעיל את המשתמש ${displayName}?`
        }
        warning={
          user.isActive
            ? 'המשתמש לא יוכל להתחבר למערכת עד להפעלה מחדש.'
            : undefined
        }
        confirmLabel={user.isActive ? 'השבת משתמש' : 'הפעל משתמש'}
        variant={user.isActive ? 'danger' : 'default'}
        isLoading={actionLoading}
        onConfirm={confirmToggleActiveAction}
        onCancel={() => setConfirmToggleActive(false)}
      />
    </div>
  )
}

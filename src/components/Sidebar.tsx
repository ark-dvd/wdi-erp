'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import {
  Users,
  FolderKanban,
  Calendar,
  Wrench,
  Car,
  Building2,
  FileText,
  DollarSign,
  Bot,
  Shield,
  LogOut,
  UserCircle,
  Contact
} from 'lucide-react'

// RBAC v1: Canonical admin roles (DOC-013 §10.2)
const RBAC_ADMIN_ROLES = ['owner', 'trust_officer']

const menuGroup1 = [
  { href: '/dashboard/events', label: 'יומן אירועים', icon: Calendar },
  { href: '/dashboard/projects', label: 'פרויקטים', icon: FolderKanban },
]

const menuGroup2 = [
  { href: '/dashboard/hr', label: 'כח אדם', icon: Users },
  { href: '/dashboard/contacts', label: 'אנשי קשר', icon: Contact },
  { href: '/dashboard/vendors', label: 'דירוג ספקים', icon: Building2 },
  { href: '/dashboard/equipment', label: 'ציוד', icon: Wrench },
  { href: '/dashboard/vehicles', label: 'רכבים', icon: Car },
]

const menuGroup3 = [
  { href: '/dashboard/contracts', label: 'חוזים', icon: FileText },
  { href: '/dashboard/finance', label: 'פיננסי', icon: DollarSign },
  { href: '/dashboard/agent', label: 'WDI Agent', icon: Bot },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname?.startsWith(href)
  }

  const user = session?.user
  const userRoleDisplayName = (user as any)?.roleDisplayName || 'משתמש'

  // RBAC v1: Check admin access - multiple fallback checks for robustness
  const userRoles = (user as any)?.roles || []
  const userRoleNames: string[] = userRoles.map((r: { name: string }) => r?.name).filter(Boolean)
  const primaryRole = (user as any)?.role as string | undefined

  // Check BOTH the roles array AND the primary role string
  const canAccessAdmin =
    userRoleNames.some((r: string) => RBAC_ADMIN_ROLES.includes(r)) ||
    (primaryRole ? RBAC_ADMIN_ROLES.includes(primaryRole) : false)

  // Debug log - remove after confirming fix works
  if (typeof window !== 'undefined') {
    console.log('[Sidebar Auth Debug]', {
      userRoles,
      userRoleNames,
      primaryRole,
      canAccessAdmin,
      RBAC_ADMIN_ROLES
    })
  }

  const renderMenuItem = (item: { href: string; label: string; icon: any }) => {
    const Icon = item.icon
    const active = isActive(item.href)
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
            active
              ? 'bg-[#0a3161] text-white'
              : 'text-[#3a3a3d] hover:bg-[#f5f6f8]'
          }`}
        >
          <Icon size={20} />
          <span>{item.label}</span>
        </Link>
      </li>
    )
  }

  return (
    <aside className="w-64 bg-white border-l border-[#e2e4e8] h-screen flex flex-col">
      <div className="p-6 border-b border-[#e2e4e8]">
        <Link href="/dashboard" className="flex flex-col items-center">
          <img src="/logo.png" alt="WDI Logo" className="h-12" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {menuGroup1.map(renderMenuItem)}
        </ul>
        <ul className="space-y-1 px-3 mt-6">
          {menuGroup2.map(renderMenuItem)}
        </ul>
        <ul className="space-y-1 px-3 mt-6">
          {menuGroup3.map(renderMenuItem)}
        </ul>
      </nav>

      {canAccessAdmin && (
        <div className="px-3 py-2 border-t border-[#e2e4e8]">
          <Link
            href="/dashboard/admin"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
              isActive('/dashboard/admin')
                ? 'bg-[#0a3161] text-white'
                : 'text-[#3a3a3d] hover:bg-[#f5f6f8]'
            }`}
          >
            <Shield size={20} />
            <span>Admin Console</span>
          </Link>
        </div>
      )}

      <div className="p-4 border-t border-[#e2e4e8]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0a3161]/10 flex items-center justify-center overflow-hidden">
            {((user as any)?.employeePhoto || user?.image) ? (
              <Image
                src={((user as any)?.employeePhoto || user?.image)}
                alt={((user as any)?.employeeName || user?.name) || 'User'}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <UserCircle size={24} className="text-[#0a3161]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#0a3161] truncate">
              {((user as any)?.employeeName || user?.name) || 'משתמש'}
            </p>
            <p className="text-xs text-[#8f8f96] truncate">{userRoleDisplayName}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="p-2 text-[#8f8f96] hover:text-[#0a3161] hover:bg-[#f5f6f8] rounded-lg transition-colors"
            title="התנתק"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Version Footer */}
      <div className="text-xs text-gray-400 text-center py-2 border-t border-[#e2e4e8]">
        {process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}
      </div>
    </aside>
  )
}

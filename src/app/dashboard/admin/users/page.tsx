'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePageView } from '@/hooks/useActivityLog'
import { ArrowRight, Search } from 'lucide-react'

interface User {
  id: string
  email: string
  name: string | null
  lastLogin: string | null
  role: {
    name: string
    displayName: string
  }
  employee: {
    firstName: string
    lastName: string
    role: string
  } | null
}

const roleColors: Record<string, string> = {
  founder: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
  employee: 'bg-green-100 text-green-800',
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  usePageView('admin')
  const router = useRouter()
  
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  const userRole = (session?.user as any)?.role

  useEffect(() => {
    if (status === 'authenticated' && userRole !== 'founder') {
      router.push('/dashboard')
    }
  }, [status, userRole, router])

  useEffect(() => {
    if (userRole === 'founder') {
      fetchUsers()
    }
  }, [userRole])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (err) {
      console.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'טרם התחבר'
    const date = new Date(dateStr)
    return date.toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Jerusalem'
    })
  }

  const filteredUsers = users.filter(user => {
    const searchLower = search.toLowerCase()
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.name?.toLowerCase().includes(searchLower) ||
      user.employee?.firstName.toLowerCase().includes(searchLower) ||
      user.employee?.lastName.toLowerCase().includes(searchLower)
    )
  })

  if (status === 'loading' || loading) {
    return <div className="p-8 text-center">טוען...</div>
  }

  if (userRole !== 'founder') {
    return <div className="p-8 text-center text-red-600">אין לך הרשאה לדף זה</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin" className="text-gray-500 hover:text-gray-700">
          <ArrowRight size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">ניהול משתמשים</h1>
          <p className="text-gray-500">{users.length} משתמשים במערכת</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם או אימייל..."
            className="input pr-10 w-full"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-right">
            <tr>
              <th className="p-3 font-medium text-gray-600">שם</th>
              <th className="p-3 font-medium text-gray-600">אימייל</th>
              <th className="p-3 font-medium text-gray-600">הרשאה</th>
              <th className="p-3 font-medium text-gray-600">תפקיד בחברה</th>
              <th className="p-3 font-medium text-gray-600">כניסה אחרונה</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="p-3 font-medium">
                  {user.employee 
                    ? `${user.employee.firstName} ${user.employee.lastName}`
                    : user.name || '-'
                  }
                </td>
                <td className="p-3 text-gray-600">{user.email}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[user.role.name] || 'bg-gray-100'}`}>
                    {user.role.displayName}
                  </span>
                </td>
                <td className="p-3 text-gray-600">
                  {user.employee?.role || '-'}
                </td>
                <td className="p-3 text-sm text-gray-500" dir="ltr">
                  {formatDateTime(user.lastLogin)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

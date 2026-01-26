// ================================================
// WDI ERP - Admin Duplicates Page
// Version: 20260125-RBAC-V1
// RBAC v1: Multi-role authorization per DOC-013 §10.2
// ================================================
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { usePageView } from '@/hooks/useActivityLog'
import {
  Search,
  RefreshCw,
  Building2,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Loader2
} from 'lucide-react'

// RBAC admin roles that can access this page (DOC-013 §10.2)
const RBAC_ADMIN_ROLES = ['owner', 'trust_officer']

interface DuplicateSet {
  id: string
  entityType: 'organization' | 'contact'
  primaryId: string
  secondaryId: string
  primaryName: string
  secondaryName: string
  matchType: string
  score: number
  reason: string | null
  status: 'pending' | 'merged' | 'rejected' | 'skipped'
  createdAt: string
  reviewedAt: string | null
}

interface Stats {
  pending?: number
  merged?: number
  rejected?: number
  skipped?: number
}

export default function DuplicatesPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  usePageView('admin')
  
  const [duplicates, setDuplicates] = useState<DuplicateSet[]>([])
  const [stats, setStats] = useState<Stats>({})
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [entityFilter, setEntityFilter] = useState<string>('')
  const [scanResults, setScanResults] = useState<any>(null)

  // RBAC v1: Check admin access (both roles array and role string)
  const userRoles = (session?.user as any)?.roles || []
  const userRoleNames: string[] = userRoles.map((r: { name: string }) => r?.name).filter(Boolean)
  const primaryRole = (session?.user as any)?.role

  const canAccessAdmin =
    userRoleNames.some((r: string) => RBAC_ADMIN_ROLES.includes(r)) ||
    (primaryRole ? RBAC_ADMIN_ROLES.includes(primaryRole) : false)

  useEffect(() => {
    if (sessionStatus === 'authenticated' && !canAccessAdmin) {
      router.push('/dashboard')
    }
  }, [sessionStatus, canAccessAdmin, router])

  useEffect(() => {
    if (sessionStatus === 'authenticated' && canAccessAdmin) {
      fetchDuplicates()
    }
  }, [sessionStatus, canAccessAdmin, statusFilter, entityFilter])

  const fetchDuplicates = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('status', statusFilter)
      if (entityFilter) params.set('entityType', entityFilter)

      const res = await fetch(`/api/admin/duplicates?${params}`)
      const data = await res.json()
      
      setDuplicates(data.duplicates || [])
      setStats(data.stats || {})
    } catch (error) {
      console.error('Error fetching duplicates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async () => {
    setScanning(true)
    setScanResults(null)
    try {
      const res = await fetch('/api/admin/duplicates/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityTypes: ['organization', 'contact'],
          useGemini: true
        })
      })
      const data = await res.json()
      setScanResults(data)
      fetchDuplicates()
    } catch (error) {
      console.error('Scan error:', error)
    } finally {
      setScanning(false)
    }
  }

  const getMatchTypeLabel = (matchType: string) => {
    switch (matchType) {
      case 'exact_email': return 'אימייל זהה'
      case 'exact_phone': return 'טלפון זהה'
      case 'exact_business_id': return 'ח.פ. זהה'
      case 'name_similarity': return 'שם דומה'
      case 'gemini_detected': return 'זיהוי AI'
      default: return matchType
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-red-600 bg-red-50'
    if (score >= 75) return 'text-orange-600 bg-orange-50'
    return 'text-yellow-600 bg-yellow-50'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'merged': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />
      case 'skipped': return <ArrowRight className="w-4 h-4 text-gray-500" />
      default: return null
    }
  }

  if (sessionStatus === 'loading') {
    return <div className="p-8 text-center">טוען...</div>
  }

  if (!canAccessAdmin) {
    return <div className="p-8 text-center text-red-600">אין לך הרשאה לדף זה</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">ניהול כפילויות</h1>
          <p className="text-gray-500">זיהוי ומיזוג רשומות כפולות</p>
        </div>
        
        <button
          onClick={handleScan}
          disabled={scanning}
          className="btn-primary flex items-center gap-2"
        >
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              סורק...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              סרוק כפילויות
            </>
          )}
        </button>
      </div>

      {/* Scan Results */}
      {scanResults && (
        <div className="card p-4 bg-blue-50 border-blue-200">
          <h3 className="font-semibold mb-2">תוצאות סריקה</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">ארגונים נסרקו:</span>{' '}
              <span className="font-medium">{scanResults.results?.organizations?.scanned || 0}</span>
              {' | '}
              <span className="text-green-600">נמצאו: {scanResults.results?.organizations?.saved || 0}</span>
            </div>
            <div>
              <span className="text-gray-600">אנשי קשר נסרקו:</span>{' '}
              <span className="font-medium">{scanResults.results?.contacts?.scanned || 0}</span>
              {' | '}
              <span className="text-green-600">נמצאו: {scanResults.results?.contacts?.saved || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div 
          className={`card p-4 cursor-pointer transition-colors ${statusFilter === 'pending' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          <div className="flex items-center gap-2 text-yellow-600 mb-1">
            <Clock className="w-5 h-5" />
            <span className="font-medium">ממתינים</span>
          </div>
          <div className="text-2xl font-bold">{stats.pending || 0}</div>
        </div>
        
        <div 
          className={`card p-4 cursor-pointer transition-colors ${statusFilter === 'merged' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStatusFilter('merged')}
        >
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">מוזגו</span>
          </div>
          <div className="text-2xl font-bold">{stats.merged || 0}</div>
        </div>
        
        <div 
          className={`card p-4 cursor-pointer transition-colors ${statusFilter === 'rejected' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStatusFilter('rejected')}
        >
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">נדחו</span>
          </div>
          <div className="text-2xl font-bold">{stats.rejected || 0}</div>
        </div>
        
        <div 
          className={`card p-4 cursor-pointer transition-colors ${statusFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">סה"כ</span>
          </div>
          <div className="text-2xl font-bold">
            {(stats.pending || 0) + (stats.merged || 0) + (stats.rejected || 0) + (stats.skipped || 0)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setEntityFilter('')}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              entityFilter === '' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            הכל
          </button>
          <button
            onClick={() => setEntityFilter('organization')}
            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${
              entityFilter === 'organization' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Building2 className="w-4 h-4" />
            ארגונים
          </button>
          <button
            onClick={() => setEntityFilter('contact')}
            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${
              entityFilter === 'contact' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Users className="w-4 h-4" />
            אנשי קשר
          </button>
        </div>

        <button
          onClick={fetchDuplicates}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="רענן"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">סוג</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">רשומה ראשונה</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">רשומה שנייה</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">סוג התאמה</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">ציון</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">סטטוס</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">תאריך</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  טוען...
                </td>
              </tr>
            ) : duplicates.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {statusFilter === 'pending' 
                    ? 'אין כפילויות ממתינות לטיפול'
                    : 'לא נמצאו כפילויות'
                  }
                </td>
              </tr>
            ) : (
              duplicates.map((dup) => (
                <tr 
                  key={dup.id}
                  onClick={() => router.push(`/dashboard/admin/duplicates/${dup.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {dup.entityType === 'organization' ? (
                        <Building2 className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Users className="w-4 h-4 text-purple-500" />
                      )}
                      <span className="text-sm">
                        {dup.entityType === 'organization' ? 'ארגון' : 'איש קשר'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{dup.primaryName}</td>
                  <td className="px-4 py-3 font-medium">{dup.secondaryName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {getMatchTypeLabel(dup.matchType)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getScoreColor(dup.score)}`}>
                      {dup.score}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(dup.status)}
                      <span className="text-sm">
                        {dup.status === 'pending' && 'ממתין'}
                        {dup.status === 'merged' && 'מוזג'}
                        {dup.status === 'rejected' && 'נדחה'}
                        {dup.status === 'skipped' && 'דולג'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(dup.createdAt).toLocaleDateString('he-IL')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

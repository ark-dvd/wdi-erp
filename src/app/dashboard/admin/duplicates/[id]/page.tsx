// /home/user/wdi-erp/src/app/dashboard/admin/duplicates/[id]/page.tsx
// Version: 20260117-224500
// Duplicate comparison and merge page
// Fix: Changed from use(params) to useParams() for client component

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { usePageView } from '@/hooks/useActivityLog'
import { 
  ArrowRight, 
  Building2, 
  Users, 
  Check, 
  X,
  Undo2,
  Loader2,
  AlertTriangle,
  ChevronRight
} from 'lucide-react'

interface ConflictField {
  field: string
  label: string
  primaryValue: any
  secondaryValue: any
  type: 'text' | 'array' | 'date' | 'number'
}

interface DuplicateData {
  duplicateSet: any
  primary: any
  secondary: any
  conflicts: ConflictField[]
}

export default function DuplicateDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  usePageView('admin')

  const [data, setData] = useState<DuplicateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedMaster, setSelectedMaster] = useState<'primary' | 'secondary'>('primary')
  const [fieldSelections, setFieldSelections] = useState<Record<string, 'primary' | 'secondary'>>({})

  const userRole = (session?.user as any)?.role

  useEffect(() => {
    if (sessionStatus === 'authenticated' && userRole !== 'founder') {
      router.push('/dashboard')
    }
  }, [sessionStatus, userRole, router])

  useEffect(() => {
    if (sessionStatus === 'authenticated' && userRole === 'founder') {
      fetchDuplicate()
    }
  }, [sessionStatus, userRole, id])

  const fetchDuplicate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/duplicates/${id}`)
      const result = await res.json()
      setData(result)
      
      const initialSelections: Record<string, 'primary' | 'secondary'> = {}
      for (const conflict of result.conflicts || []) {
        if (result.primary?.[conflict.field] && !result.secondary?.[conflict.field]) {
          initialSelections[conflict.field] = 'primary'
        } else if (!result.primary?.[conflict.field] && result.secondary?.[conflict.field]) {
          initialSelections[conflict.field] = 'secondary'
        } else {
          initialSelections[conflict.field] = 'primary'
        }
      }
      setFieldSelections(initialSelections)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMerge = async () => {
    if (!data) return
    
    setProcessing(true)
    try {
      const masterId = selectedMaster === 'primary' 
        ? data.duplicateSet.primaryId 
        : data.duplicateSet.secondaryId

      const fieldResolutions = data.conflicts.map(conflict => {
        const source = fieldSelections[conflict.field] || 'primary'
        const actualSource = selectedMaster === source ? 'primary' : 'secondary'
        const value = source === 'primary' ? data.primary?.[conflict.field] : data.secondary?.[conflict.field]
        
        return {
          field: conflict.field,
          value,
          source: actualSource as 'primary' | 'secondary' | 'merged'
        }
      })

      const res = await fetch(`/api/admin/duplicates/${id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterId, fieldResolutions })
      })

      const result = await res.json()
      
      if (result.success) {
        router.push('/dashboard/admin/duplicates')
      } else {
        alert(result.error || 'שגיאה במיזוג')
      }
    } catch (error) {
      console.error('Merge error:', error)
      alert('שגיאה במיזוג')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    setProcessing(true)
    try {
      await fetch(`/api/admin/duplicates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      })
      router.push('/dashboard/admin/duplicates')
    } catch (error) {
      console.error('Reject error:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleUndo = async () => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/duplicates/${id}/undo`, {
        method: 'POST'
      })
      const result = await res.json()
      
      if (result.success) {
        fetchDuplicate()
      } else {
        alert(result.error || 'שגיאה בביטול')
      }
    } catch (error) {
      console.error('Undo error:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleSkip = () => {
    router.push('/dashboard/admin/duplicates')
  }

  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">ריק</span>
    }
    if (type === 'array' && Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-400 italic">ריק</span>
      return value.join(', ')
    }
    if (type === 'date' && value) {
      return new Date(value).toLocaleDateString('he-IL')
    }
    return String(value)
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
        טוען...
      </div>
    )
  }

  if (userRole !== 'founder') {
    return <div className="p-8 text-center text-red-600">אין לך הרשאה לדף זה</div>
  }

  if (!data || !data.primary || !data.secondary) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">רשומה לא נמצאה</h2>
        <p className="text-gray-500 mb-4">ייתכן שאחת הרשומות נמחקה</p>
        <Link href="/dashboard/admin/duplicates" className="btn-secondary">
          חזרה לרשימה
        </Link>
      </div>
    )
  }

  const { duplicateSet, primary, secondary, conflicts } = data
  const isOrganization = duplicateSet.entityType === 'organization'

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/admin" className="hover:text-blue-600">Admin</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/dashboard/admin/duplicates" className="hover:text-blue-600">כפילויות</Link>
        <ChevronRight className="w-4 h-4" />
        <span>השוואה</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {isOrganization ? (
              <Building2 className="w-6 h-6 text-blue-500" />
            ) : (
              <Users className="w-6 h-6 text-purple-500" />
            )}
            <h1 className="text-2xl font-bold">
              השוואת {isOrganization ? 'ארגונים' : 'אנשי קשר'}
            </h1>
          </div>
          <p className="text-gray-500">
            ציון התאמה: <span className="font-semibold text-orange-600">{duplicateSet.score}%</span>
            {duplicateSet.reason && ` • ${duplicateSet.reason}`}
          </p>
        </div>

        {duplicateSet.status === 'merged' && (
          <button
            onClick={handleUndo}
            disabled={processing}
            className="btn-secondary flex items-center gap-2"
          >
            <Undo2 className="w-4 h-4" />
            בטל מיזוג
          </button>
        )}
      </div>

      {/* Status Banner */}
      {duplicateSet.status !== 'pending' && (
        <div className={`p-4 rounded-lg ${
          duplicateSet.status === 'merged' ? 'bg-green-50 text-green-800' :
          duplicateSet.status === 'rejected' ? 'bg-red-50 text-red-800' :
          'bg-gray-50 text-gray-800'
        }`}>
          {duplicateSet.status === 'merged' && 'כפילות זו מוזגה'}
          {duplicateSet.status === 'rejected' && 'כפילות זו נדחתה (לא כפילות)'}
          {duplicateSet.status === 'skipped' && 'כפילות זו דולגה'}
        </div>
      )}

      {/* Master Selection */}
      {duplicateSet.status === 'pending' && (
        <div className="card p-4">
          <h3 className="font-semibold mb-3">בחר רשומה ראשית (Master)</h3>
          <p className="text-sm text-gray-500 mb-4">
            הרשומה הראשית תישאר, והשנייה תימחק לאחר המיזוג
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedMaster('primary')}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                selectedMaster === 'primary' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {selectedMaster === 'primary' && <Check className="w-5 h-5 text-blue-500" />}
                <span className="font-medium">רשומה א׳</span>
              </div>
              <div className="text-lg font-semibold">
                {isOrganization ? primary.name : `${primary.firstName} ${primary.lastName}`}
              </div>
              {!isOrganization && primary.organization && (
                <div className="text-sm text-gray-500">{primary.organization.name}</div>
              )}
              <div className="text-xs text-gray-400 mt-2">
                {isOrganization 
                  ? `${primary._count?.contacts || 0} אנשי קשר`
                  : `${primary._count?.individualReviews || 0} דירוגים, ${primary._count?.projects || 0} פרויקטים`
                }
              </div>
            </button>

            <button
              onClick={() => setSelectedMaster('secondary')}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                selectedMaster === 'secondary' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {selectedMaster === 'secondary' && <Check className="w-5 h-5 text-blue-500" />}
                <span className="font-medium">רשומה ב׳</span>
              </div>
              <div className="text-lg font-semibold">
                {isOrganization ? secondary.name : `${secondary.firstName} ${secondary.lastName}`}
              </div>
              {!isOrganization && secondary.organization && (
                <div className="text-sm text-gray-500">{secondary.organization.name}</div>
              )}
              <div className="text-xs text-gray-400 mt-2">
                {isOrganization 
                  ? `${secondary._count?.contacts || 0} אנשי קשר`
                  : `${secondary._count?.individualReviews || 0} דירוגים, ${secondary._count?.projects || 0} פרויקטים`
                }
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Field Comparison */}
      {conflicts.length > 0 && duplicateSet.status === 'pending' && (
        <div className="card">
          <div className="p-4 border-b">
            <h3 className="font-semibold">שדות עם קונפליקט</h3>
            <p className="text-sm text-gray-500">בחר איזה ערך לשמור בכל שדה</p>
          </div>
          <div className="divide-y">
            {conflicts.map((conflict) => (
              <div key={conflict.field} className="p-4">
                <div className="font-medium mb-3">{conflict.label}</div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setFieldSelections(prev => ({ ...prev, [conflict.field]: 'primary' }))}
                    className={`p-3 rounded-lg border text-right transition-colors ${
                      fieldSelections[conflict.field] === 'primary'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {fieldSelections[conflict.field] === 'primary' && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                      <span className="text-xs text-gray-500">רשומה א׳</span>
                    </div>
                    <div className="text-sm">{formatValue(conflict.primaryValue, conflict.type)}</div>
                  </button>
                  
                  <button
                    onClick={() => setFieldSelections(prev => ({ ...prev, [conflict.field]: 'secondary' }))}
                    className={`p-3 rounded-lg border text-right transition-colors ${
                      fieldSelections[conflict.field] === 'secondary'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {fieldSelections[conflict.field] === 'secondary' && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                      <span className="text-xs text-gray-500">רשומה ב׳</span>
                    </div>
                    <div className="text-sm">{formatValue(conflict.secondaryValue, conflict.type)}</div>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side by Side Comparison */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold">השוואה מלאה</h3>
        </div>
        <div className="grid grid-cols-2 divide-x divide-x-reverse">
          {/* Primary */}
          <div className="p-4">
            <h4 className="font-medium mb-4 text-center">
              {isOrganization ? primary.name : `${primary.firstName} ${primary.lastName}`}
            </h4>
            <dl className="space-y-3 text-sm">
              {isOrganization ? (
                <>
                  <DataRow label="סוג" value={primary.type} />
                  <DataRow label="טלפון" value={primary.phone} />
                  <DataRow label="אימייל" value={primary.email} />
                  <DataRow label="אתר" value={primary.website} />
                  <DataRow label="כתובת" value={primary.address} />
                  <DataRow label="ח.פ." value={primary.businessId} />
                  <DataRow label="סוגי קשר" value={primary.contactTypes?.join(', ')} />
                  <DataRow label="דיסציפלינות" value={primary.disciplines?.join(', ')} />
                  <DataRow label="דירוג" value={primary.averageRating?.toFixed(1)} />
                  <DataRow label="אנשי קשר" value={primary._count?.contacts} />
                </>
              ) : (
                <>
                  <DataRow label="טלפון" value={primary.phone} />
                  <DataRow label="טלפון נוסף" value={primary.phoneAlt} />
                  <DataRow label="אימייל" value={primary.email} />
                  <DataRow label="אימייל נוסף" value={primary.emailAlt} />
                  <DataRow label="תפקיד" value={primary.role} />
                  <DataRow label="ארגון" value={primary.organization?.name} />
                  <DataRow label="סוגי קשר" value={primary.contactTypes?.join(', ')} />
                  <DataRow label="דיסציפלינות" value={primary.disciplines?.join(', ')} />
                  <DataRow label="דירוג" value={primary.averageRating?.toFixed(1)} />
                  <DataRow label="דירוגים" value={primary._count?.individualReviews} />
                  <DataRow label="פרויקטים" value={primary._count?.projects} />
                </>
              )}
            </dl>
          </div>

          {/* Secondary */}
          <div className="p-4">
            <h4 className="font-medium mb-4 text-center">
              {isOrganization ? secondary.name : `${secondary.firstName} ${secondary.lastName}`}
            </h4>
            <dl className="space-y-3 text-sm">
              {isOrganization ? (
                <>
                  <DataRow label="סוג" value={secondary.type} />
                  <DataRow label="טלפון" value={secondary.phone} />
                  <DataRow label="אימייל" value={secondary.email} />
                  <DataRow label="אתר" value={secondary.website} />
                  <DataRow label="כתובת" value={secondary.address} />
                  <DataRow label="ח.פ." value={secondary.businessId} />
                  <DataRow label="סוגי קשר" value={secondary.contactTypes?.join(', ')} />
                  <DataRow label="דיסציפלינות" value={secondary.disciplines?.join(', ')} />
                  <DataRow label="דירוג" value={secondary.averageRating?.toFixed(1)} />
                  <DataRow label="אנשי קשר" value={secondary._count?.contacts} />
                </>
              ) : (
                <>
                  <DataRow label="טלפון" value={secondary.phone} />
                  <DataRow label="טלפון נוסף" value={secondary.phoneAlt} />
                  <DataRow label="אימייל" value={secondary.email} />
                  <DataRow label="אימייל נוסף" value={secondary.emailAlt} />
                  <DataRow label="תפקיד" value={secondary.role} />
                  <DataRow label="ארגון" value={secondary.organization?.name} />
                  <DataRow label="סוגי קשר" value={secondary.contactTypes?.join(', ')} />
                  <DataRow label="דיסציפלינות" value={secondary.disciplines?.join(', ')} />
                  <DataRow label="דירוג" value={secondary.averageRating?.toFixed(1)} />
                  <DataRow label="דירוגים" value={secondary._count?.individualReviews} />
                  <DataRow label="פרויקטים" value={secondary._count?.projects} />
                </>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {duplicateSet.status === 'pending' && (
        <div className="flex justify-between items-center pt-4 border-t">
          <button
            onClick={handleSkip}
            className="btn-secondary"
          >
            דלג
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={processing}
              className="btn-secondary flex items-center gap-2 text-red-600 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
              לא כפילות
            </button>

            <button
              onClick={handleMerge}
              disabled={processing}
              className="btn-primary flex items-center gap-2"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              מזג רשומות
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium">
        {value || <span className="text-gray-300">-</span>}
      </dd>
    </div>
  )
}

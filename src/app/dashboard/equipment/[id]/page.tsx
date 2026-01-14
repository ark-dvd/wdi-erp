// ============================================
// src/app/dashboard/equipment/[id]/page.tsx
// Version: 20260114-230500
// Equipment detail page
// FIXED: Added null check for params
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowRight, 
  Edit, 
  Trash2, 
  Wrench,
  User,
  Building2,
  FileText,
  Laptop,
  Monitor,
  Keyboard,
  Mouse,
  Printer,
  Tv,
  Cable,
  HardDrive,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react'

const typeLabels: Record<string, string> = {
  LAPTOP: 'מחשב נייד',
  CHARGER: 'מטען למחשב',
  DOCKING_STATION: 'תחנת עגינה',
  MONITOR: 'מסך',
  MOUSE: 'עכבר',
  KEYBOARD: 'מקלדת',
  MONITOR_ARM: 'זרוע למסך',
  MEETING_ROOM_TV: 'מסך חדר ישיבות',
  PRINTER: 'מדפסת',
  SCANNER: 'סורק',
  OTHER: 'אחר',
}

const typeIcons: Record<string, any> = {
  LAPTOP: Laptop,
  CHARGER: Cable,
  DOCKING_STATION: HardDrive,
  MONITOR: Monitor,
  MOUSE: Mouse,
  KEYBOARD: Keyboard,
  MONITOR_ARM: Monitor,
  MEETING_ROOM_TV: Tv,
  PRINTER: Printer,
  SCANNER: Printer,
  OTHER: Wrench,
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'פעיל',
  INACTIVE: 'מושבת',
  IN_REPAIR: 'בתיקון',
  SOLD: 'נמכר',
  LOST: 'אבד',
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  IN_REPAIR: 'bg-yellow-100 text-yellow-800',
  SOLD: 'bg-red-100 text-red-800',
  LOST: 'bg-red-100 text-red-800',
}

interface Equipment {
  id: string
  type: string
  typeOther: string | null
  manufacturer: string
  model: string
  serialNumber: string | null
  yearOfManufacture: number | null
  supplier: string | null
  purchaseDate: string | null
  warrantyExpiry: string | null
  invoiceUrl: string | null
  location: string | null
  status: string
  isOfficeEquipment: boolean
  screenSizeInch: number | null
  processor: string | null
  ramGB: number | null
  storageGB: number | null
  hasTouchscreen: boolean | null
  operatingSystem: string | null
  notes: string | null
  currentAssignee: {
    id: string
    firstName: string
    lastName: string
    phone: string | null
    email: string | null
    photoUrl: string | null
    role: string
  } | null
  assignments: {
    id: string
    startDate: string
    endDate: string | null
    notes: string | null
    employee: {
      id: string
      firstName: string
      lastName: string
      photoUrl: string | null
    }
  }[]
  createdAt: string
  updatedAt: string
  createdBy: {
    name: string | null
    employee: { firstName: string; lastName: string } | null
  } | null
  updatedBy: {
    name: string | null
    employee: { firstName: string; lastName: string } | null
  } | null
}

export default function EquipmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const id = params?.id as string

  useEffect(() => {
    if (id) {
      fetchEquipment()
    }
  }, [id])

  const fetchEquipment = async () => {
    try {
      const res = await fetch(`/api/equipment/${id}`)
      if (res.ok) {
        setEquipment(await res.json())
      } else {
        router.push('/dashboard/equipment')
      }
    } catch (error) {
      console.error('Error fetching equipment:', error)
      router.push('/dashboard/equipment')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!equipment) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/equipment/${equipment.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/dashboard/equipment')
      }
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('he-IL')
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('he-IL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const getUserName = (user: { name: string | null; employee: { firstName: string; lastName: string } | null } | null) => {
    if (!user) return '-'
    if (user.name === 'WDI Agent' || user.name === 'system') return 'WDI Agent'
    if (user.employee) return `${user.employee.firstName} ${user.employee.lastName}`
    return user.name || '-'
  }

  const getWarrantyStatus = () => {
    if (!equipment?.warrantyExpiry) return null
    const warrantyDate = new Date(equipment.warrantyExpiry)
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    if (warrantyDate < today) {
      return { label: 'פג תוקף', color: 'text-red-600', icon: AlertTriangle }
    } else if (warrantyDate <= thirtyDaysFromNow) {
      return { label: 'פג בקרוב', color: 'text-yellow-600', icon: Clock }
    } else {
      return { label: 'בתוקף', color: 'text-green-600', icon: CheckCircle }
    }
  }

  if (!id || loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-[#0a3161]" /></div>
  }

  if (!equipment) {
    return <div className="text-center py-12"><p className="text-[#8f8f96]">ציוד לא נמצא</p></div>
  }

  const TypeIcon = typeIcons[equipment.type] || Wrench
  const warrantyStatus = getWarrantyStatus()
  const isLaptop = equipment.type === 'LAPTOP'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/dashboard/equipment" className="text-[#0a3161] text-sm flex items-center gap-1 mb-2 hover:underline">
            <ArrowRight size={14} /> חזרה לרשימת הציוד
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#0a3161]/10 flex items-center justify-center">
              <TypeIcon className="text-[#0a3161]" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0a3161]">{equipment.manufacturer} {equipment.model}</h1>
              <p className="text-[#8f8f96]">
                {typeLabels[equipment.type] || equipment.typeOther || equipment.type}
                {equipment.serialNumber && ` • S/N: ${equipment.serialNumber}`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/equipment/${equipment.id}/edit`} className="flex items-center gap-2 px-4 py-2 border border-[#e2e4e8] rounded-lg hover:bg-[#f5f6f8]">
            <Edit size={16} /><span>עריכה</span>
          </Link>
          <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
            <Trash2 size={16} /><span>מחיקה</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#0a3161]">סטטוס</h2>
              <span className={`px-3 py-1 rounded-full text-sm ${statusColors[equipment.status]}`}>
                {statusLabels[equipment.status]}
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-[#8f8f96]">משויך ל</span>
                <div className="flex items-center gap-2 mt-1">
                  {equipment.isOfficeEquipment ? (
                    <><Building2 size={18} className="text-[#0a3161]" /><span className="font-medium">{equipment.location || 'משרד'}</span></>
                  ) : equipment.currentAssignee ? (
                    <><User size={18} className="text-[#0a3161]" />
                    <Link href={`/dashboard/hr/${equipment.currentAssignee.id}`} className="font-medium text-[#0a3161] hover:underline">
                      {equipment.currentAssignee.firstName} {equipment.currentAssignee.lastName}
                    </Link></>
                  ) : (<span className="text-[#a7a7b0]">לא משויך</span>)}
                </div>
              </div>
              {warrantyStatus && (
                <div>
                  <span className="text-sm text-[#8f8f96]">אחריות</span>
                  <div className={`flex items-center gap-2 mt-1 ${warrantyStatus.color}`}>
                    <warrantyStatus.icon size={18} />
                    <span className="font-medium">{formatDate(equipment.warrantyExpiry)}</span>
                    <span className="text-sm">({warrantyStatus.label})</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="font-semibold text-[#0a3161] mb-4">פרטי ציוד</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div><span className="text-sm text-[#8f8f96]">יצרן</span><p className="font-medium">{equipment.manufacturer}</p></div>
              <div><span className="text-sm text-[#8f8f96]">דגם</span><p className="font-medium">{equipment.model}</p></div>
              <div><span className="text-sm text-[#8f8f96]">מספר סריאלי</span><p className="font-medium">{equipment.serialNumber || '-'}</p></div>
              <div><span className="text-sm text-[#8f8f96]">שנת ייצור</span><p className="font-medium">{equipment.yearOfManufacture || '-'}</p></div>
              {equipment.screenSizeInch && (<div><span className="text-sm text-[#8f8f96]">גודל מסך</span><p className="font-medium">{equipment.screenSizeInch}"</p></div>)}
            </div>
          </div>

          {/* Laptop Specs */}
          {isLaptop && (equipment.processor || equipment.ramGB || equipment.storageGB) && (
            <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
              <h2 className="font-semibold text-[#0a3161] mb-4">מפרט טכני</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {equipment.processor && (<div><span className="text-sm text-[#8f8f96]">מעבד</span><p className="font-medium">{equipment.processor}</p></div>)}
                {equipment.ramGB && (<div><span className="text-sm text-[#8f8f96]">זיכרון</span><p className="font-medium">{equipment.ramGB} GB</p></div>)}
                {equipment.storageGB && (<div><span className="text-sm text-[#8f8f96]">אחסון</span><p className="font-medium">{equipment.storageGB} GB</p></div>)}
                {equipment.operatingSystem && (<div><span className="text-sm text-[#8f8f96]">מערכת הפעלה</span><p className="font-medium">{equipment.operatingSystem}</p></div>)}
                <div><span className="text-sm text-[#8f8f96]">מסך מגע</span><p className="font-medium">{equipment.hasTouchscreen ? 'כן' : 'לא'}</p></div>
              </div>
            </div>
          )}

          {/* Purchase Info */}
          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="font-semibold text-[#0a3161] mb-4">פרטי רכישה</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div><span className="text-sm text-[#8f8f96]">ספק</span><p className="font-medium">{equipment.supplier || '-'}</p></div>
              <div><span className="text-sm text-[#8f8f96]">תאריך רכישה</span><p className="font-medium">{formatDate(equipment.purchaseDate)}</p></div>
              <div><span className="text-sm text-[#8f8f96]">תפוגת אחריות</span><p className="font-medium">{formatDate(equipment.warrantyExpiry)}</p></div>
              {equipment.invoiceUrl && (
                <div>
                  <span className="text-sm text-[#8f8f96]">חשבונית</span>
                  <a href={equipment.invoiceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#0a3161] hover:underline">
                    <FileText size={16} /><span>צפה בחשבונית</span><ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {equipment.notes && (
            <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
              <h2 className="font-semibold text-[#0a3161] mb-4">הערות</h2>
              <p className="text-[#3a3a3d] whitespace-pre-wrap">{equipment.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assignment History */}
          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="font-semibold text-[#0a3161] mb-4">היסטוריית שיוכים</h2>
            {equipment.assignments.length === 0 ? (
              <p className="text-[#8f8f96] text-sm">אין היסטוריית שיוכים</p>
            ) : (
              <div className="space-y-3">
                {equipment.assignments.map((assignment, index) => (
                  <div key={assignment.id} className={`p-3 rounded-lg ${index === 0 && !assignment.endDate ? 'bg-green-50 border border-green-200' : 'bg-[#f5f6f8]'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <User size={14} className="text-[#8f8f96]" />
                      <Link href={`/dashboard/hr/${assignment.employee.id}`} className="font-medium text-[#0a3161] text-sm hover:underline">
                        {assignment.employee.firstName} {assignment.employee.lastName}
                      </Link>
                      {index === 0 && !assignment.endDate && (<span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">נוכחי</span>)}
                    </div>
                    <div className="text-xs text-[#8f8f96]">
                      {formatDate(assignment.startDate)}{assignment.endDate && ` - ${formatDate(assignment.endDate)}`}
                    </div>
                    {assignment.notes && (<div className="text-xs text-[#8f8f96] mt-1">{assignment.notes}</div>)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="font-semibold text-[#0a3161] mb-4">מידע נוסף</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-[#8f8f96]">נוצר</span>
                <p>{formatDateTime(equipment.createdAt)}</p>
                <p className="text-[#8f8f96]">{getUserName(equipment.createdBy)}</p>
              </div>
              <div>
                <span className="text-[#8f8f96]">עודכן לאחרונה</span>
                <p>{formatDateTime(equipment.updatedAt)}</p>
                <p className="text-[#8f8f96]">{getUserName(equipment.updatedBy)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-[#0a3161] mb-2">מחיקת ציוד</h3>
            <p className="text-[#3a3a3d] mb-4">האם למחוק את {typeLabels[equipment.type]} - {equipment.manufacturer} {equipment.model}?</p>
            <p className="text-sm text-[#8f8f96] mb-6">פעולה זו תמחק גם את היסטוריית השיוכים ולא ניתן לשחזר אותה.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border border-[#e2e4e8] rounded-lg hover:bg-[#f5f6f8]">ביטול</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'מוחק...' : 'מחק'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

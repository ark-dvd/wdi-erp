// ============================================
// src/app/dashboard/equipment/page.tsx
// Version: 20260112-235000
// Equipment list page
// ============================================

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Wrench, 
  Plus, 
  Search, 
  User, 
  Building2,
  Edit, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  Laptop,
  Monitor,
  Keyboard,
  Mouse,
  Printer,
  Tv,
  Cable,
  HardDrive,
  Loader2
} from 'lucide-react'

// Equipment type labels and icons
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

type SortField = 'type' | 'manufacturer' | 'assignee' | 'status' | 'warrantyExpiry' | 'updatedAt'

interface Equipment {
  id: string
  type: string
  typeOther: string | null
  manufacturer: string
  model: string
  serialNumber: string | null
  status: string
  isOfficeEquipment: boolean
  location: string | null
  warrantyExpiry: string | null
  currentAssignee: {
    id: string
    firstName: string
    lastName: string
    photoUrl: string | null
  } | null
  updatedAt: string
  updatedBy: {
    name: string | null
    employee: { firstName: string; lastName: string } | null
  } | null
  _count: {
    assignments: number
  }
}

export default function EquipmentPage() {
  const router = useRouter()
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all') // all, office, employee
  const [sortField, setSortField] = useState<SortField>('updatedAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<Equipment | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchEquipment()
  }, [])

  const fetchEquipment = async () => {
    try {
      const res = await fetch('/api/equipment')
      if (res.ok) {
        const data = await res.json()
        // MAYBACH: Handle paginated response format { items: [...], pagination: {...} }
        setEquipment(data.items || (Array.isArray(data) ? data : []))
      }
    } catch (error) {
      console.error('Error fetching equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const filtered = equipment
    .filter(item => {
      const matchSearch = search === '' ||
        item.manufacturer?.toLowerCase().includes(search.toLowerCase()) ||
        item.model?.toLowerCase().includes(search.toLowerCase()) ||
        item.serialNumber?.toLowerCase().includes(search.toLowerCase()) ||
        item.currentAssignee?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        item.currentAssignee?.lastName?.toLowerCase().includes(search.toLowerCase())
      
      const matchStatus = statusFilter === 'all' || item.status === statusFilter
      const matchType = typeFilter === 'all' || item.type === typeFilter
      
      let matchLocation = true
      if (locationFilter === 'office') {
        matchLocation = item.isOfficeEquipment
      } else if (locationFilter === 'employee') {
        matchLocation = !item.isOfficeEquipment
      }
      
      return matchSearch && matchStatus && matchType && matchLocation
    })
    .sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'type':
          cmp = (typeLabels[a.type] || a.type).localeCompare(typeLabels[b.type] || b.type)
          break
        case 'manufacturer':
          cmp = `${a.manufacturer} ${a.model}`.localeCompare(`${b.manufacturer} ${b.model}`)
          break
        case 'assignee':
          const assigneeA = a.currentAssignee ? `${a.currentAssignee.firstName} ${a.currentAssignee.lastName}` : (a.isOfficeEquipment ? 'משרד' : '')
          const assigneeB = b.currentAssignee ? `${b.currentAssignee.firstName} ${b.currentAssignee.lastName}` : (b.isOfficeEquipment ? 'משרד' : '')
          cmp = assigneeA.localeCompare(assigneeB)
          break
        case 'status':
          cmp = (a.status || '').localeCompare(b.status || '')
          break
        case 'warrantyExpiry':
          cmp = new Date(a.warrantyExpiry || 0).getTime() - new Date(b.warrantyExpiry || 0).getTime()
          break
        case 'updatedAt':
          cmp = new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime()
          break
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })

  const stats = {
    total: equipment.length,
    active: equipment.filter(e => e.status === 'ACTIVE').length,
    inRepair: equipment.filter(e => e.status === 'IN_REPAIR').length,
    office: equipment.filter(e => e.isOfficeEquipment).length,
    laptops: equipment.filter(e => e.type === 'LAPTOP').length,
  }

  const openDeleteModal = (item: Equipment) => {
    setItemToDelete(item)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!itemToDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/equipment/${itemToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        setEquipment(equipment.filter(e => e.id !== itemToDelete.id))
        setShowDeleteModal(false)
        setItemToDelete(null)
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
    const date = new Date(dateStr)
    return date.toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getUpdaterName = (updatedBy: Equipment['updatedBy']) => {
    if (!updatedBy) return ''
    if (updatedBy.name === 'WDI Agent' || updatedBy.name === 'system') return 'WDI Agent'
    if (updatedBy.employee) return `${updatedBy.employee.firstName} ${updatedBy.employee.lastName}`
    return updatedBy.name || ''
  }

  const isWarrantyExpired = (date: string | null) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  const isWarrantyExpiringSoon = (date: string | null) => {
    if (!date) return false
    const warrantyDate = new Date(date)
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    return warrantyDate > today && warrantyDate <= thirtyDaysFromNow
  }

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <div
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"
    >
      <span>{children}</span>
      {sortField === field && (
        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#0a3161]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#0a3161]">ניהול ציוד</h1>
          <p className="text-[#8f8f96] text-sm mt-1">{stats.total} פריטים במערכת</p>
        </div>
        <Link
          href="/dashboard/equipment/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#0a3161] text-white rounded-lg hover:bg-[#0a3161]/90 transition-colors"
        >
          <Plus size={20} />
          <span>ציוד חדש</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-[#e2e4e8] p-4">
          <div className="text-2xl font-bold text-[#0a3161]">{stats.total}</div>
          <div className="text-sm text-[#8f8f96]">סה"כ פריטים</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e4e8] p-4">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-[#8f8f96]">פעילים</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e4e8] p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.inRepair}</div>
          <div className="text-sm text-[#8f8f96]">בתיקון</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e4e8] p-4">
          <div className="text-2xl font-bold text-[#0a3161]">{stats.laptops}</div>
          <div className="text-sm text-[#8f8f96]">מחשבים ניידים</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e4e8] p-4">
          <div className="text-2xl font-bold text-[#0a3161]">{stats.office}</div>
          <div className="text-sm text-[#8f8f96]">ציוד משרדי</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8f8f96]" size={20} />
          <input
            type="text"
            placeholder="חיפוש לפי יצרן, דגם, סריאלי או עובד..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-[#e2e4e8] rounded-lg bg-white"
        >
          <option value="all">כל הסוגים</option>
          {Object.entries(typeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-[#e2e4e8] rounded-lg bg-white"
        >
          <option value="all">כל הסטטוסים</option>
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="px-4 py-2 border border-[#e2e4e8] rounded-lg bg-white"
        >
          <option value="all">הכל</option>
          <option value="office">ציוד משרדי</option>
          <option value="employee">משויך לעובד</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e2e4e8] overflow-hidden">
        <div className="grid grid-cols-[1fr_2fr_1.5fr_100px_120px_1fr_100px] items-center gap-3 p-4 bg-[#f5f6f8] text-sm text-[#3a3a3d] font-medium border-b border-[#e2e4e8]">
          <SortHeader field="type">סוג</SortHeader>
          <SortHeader field="manufacturer">יצרן / דגם</SortHeader>
          <SortHeader field="assignee">משויך ל</SortHeader>
          <SortHeader field="status">סטטוס</SortHeader>
          <SortHeader field="warrantyExpiry">אחריות</SortHeader>
          <SortHeader field="updatedAt">עודכן</SortHeader>
          <div>פעולות</div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[#8f8f96]">לא נמצא ציוד</div>
        ) : (
          filtered.map((item) => {
            const TypeIcon = typeIcons[item.type] || Wrench
            return (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_2fr_1.5fr_100px_120px_1fr_100px] items-center gap-3 p-4 hover:bg-[#f5f6f8] border-b border-[#e2e4e8] cursor-pointer transition-colors"
                onClick={() => router.push(`/dashboard/equipment/${item.id}`)}
              >
                {/* Type */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#0a3161]/10 flex items-center justify-center">
                    <TypeIcon size={16} className="text-[#0a3161]" />
                  </div>
                  <span className="text-sm">{typeLabels[item.type] || item.typeOther || item.type}</span>
                </div>

                {/* Manufacturer / Model */}
                <div>
                  <div className="font-medium text-[#0a3161]">{item.manufacturer} {item.model}</div>
                  {item.serialNumber && (
                    <div className="text-xs text-[#8f8f96]">S/N: {item.serialNumber}</div>
                  )}
                </div>

                {/* Assignee */}
                <div className="flex items-center gap-2">
                  {item.isOfficeEquipment ? (
                    <>
                      <Building2 size={16} className="text-[#8f8f96]" />
                      <span className="text-sm text-[#3a3a3d]">{item.location || 'משרד'}</span>
                    </>
                  ) : item.currentAssignee ? (
                    <>
                      <User size={16} className="text-[#8f8f96]" />
                      <span className="text-sm text-[#3a3a3d]">
                        {item.currentAssignee.firstName} {item.currentAssignee.lastName}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-[#a7a7b0]">לא משויך</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <span className={`px-2 py-1 rounded-full text-xs ${statusColors[item.status] || 'bg-gray-100'}`}>
                    {statusLabels[item.status] || item.status}
                  </span>
                </div>

                {/* Warranty */}
                <div className="text-sm">
                  {item.warrantyExpiry ? (
                    <span className={
                      isWarrantyExpired(item.warrantyExpiry) 
                        ? 'text-red-600' 
                        : isWarrantyExpiringSoon(item.warrantyExpiry)
                          ? 'text-yellow-600'
                          : 'text-[#3a3a3d]'
                    }>
                      {formatDate(item.warrantyExpiry)}
                    </span>
                  ) : (
                    <span className="text-[#a7a7b0]">-</span>
                  )}
                </div>

                {/* Updated */}
                <div className="text-sm text-[#8f8f96]">
                  <div>{formatDateTime(item.updatedAt)}</div>
                  {getUpdaterName(item.updatedBy) && (
                    <div className="text-xs">{getUpdaterName(item.updatedBy)}</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Link
                    href={`/dashboard/equipment/${item.id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 text-[#a7a7b0] hover:text-[#0a3161] transition-colors"
                    title="עריכה"
                  >
                    <Edit size={18} />
                  </Link>
                  <button
                    onClick={(e) => { e.stopPropagation(); openDeleteModal(item) }}
                    className="p-2 text-[#a7a7b0] hover:text-red-600 transition-colors"
                    title="מחיקה"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-[#0a3161] mb-2">מחיקת ציוד</h3>
            <p className="text-[#3a3a3d] mb-4">
              האם למחוק את {typeLabels[itemToDelete.type]} - {itemToDelete.manufacturer} {itemToDelete.model}?
            </p>
            <p className="text-sm text-[#8f8f96] mb-6">
              פעולה זו תמחק גם את היסטוריית השיוכים ולא ניתן לשחזר אותה.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowDeleteModal(false); setItemToDelete(null) }}
                className="px-4 py-2 border border-[#e2e4e8] rounded-lg hover:bg-[#f5f6f8]"
              >
                ביטול
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'מוחק...' : 'מחק'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

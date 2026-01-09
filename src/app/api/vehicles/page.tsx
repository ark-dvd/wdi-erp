'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Edit, Trash2, AlertTriangle, Car, User, Gauge, AlertCircle, FileWarning } from 'lucide-react'
import SortableTable, { Column } from '@/components/SortableTable'

interface Vehicle {
  id: string
  licensePlate: string
  manufacturer: string
  model: string
  year: number | null
  color: string | null
  status: string
  contractType: string | null
  leasingCompany: string | null
  contractEndDate: string | null
  currentKm: number | null
  nextServiceDate: string | null
  nextServiceKm: number | null
  currentDriver: { id: string; firstName: string; lastName: string; photoUrl: string | null } | null
  _count: { accidents: number; services: number; fuelLogs: number; tickets: number }
}

const statusLabels: Record<string, string> = { ACTIVE: 'פעיל', IN_SERVICE: 'בטיפול', RETURNED: 'הוחזר', SOLD: 'נמכר' }
const statusColors: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-800', IN_SERVICE: 'bg-yellow-100 text-yellow-800', RETURNED: 'bg-gray-100 text-gray-800', SOLD: 'bg-red-100 text-red-800' }
const contractLabels: Record<string, string> = { RENTAL: 'השכרה', LEASING: 'ליסינג' }

export default function VehiclesPage() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ACTIVE')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/vehicles').then(r => r.json()).then(setVehicles).finally(() => setLoading(false))
  }, [])

  const handleDelete = async () => {
    if (!vehicleToDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/vehicles/${vehicleToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        setVehicles(vehicles.filter(v => v.id !== vehicleToDelete.id))
        setShowDeleteModal(false)
      } else {
        const data = await res.json()
        setError(data.error)
      }
    } catch { setError('שגיאה במחיקה') }
    finally { setDeleting(false) }
  }

  const getAlerts = (v: Vehicle) => {
    const alerts: string[] = []
    if (v.contractEndDate) {
      const days = Math.ceil((new Date(v.contractEndDate).getTime() - Date.now()) / 86400000)
      if (days <= 30 && days > 0) alerts.push(`חוזה מסתיים בעוד ${days} ימים`)
      if (days <= 0) alerts.push('חוזה פג תוקף!')
    }
    if (v.nextServiceDate) {
      const days = Math.ceil((new Date(v.nextServiceDate).getTime() - Date.now()) / 86400000)
      if (days <= 14 && days > 0) alerts.push(`טיפול בעוד ${days} ימים`)
      if (days <= 0) alerts.push('עבר מועד טיפול!')
    }
    if (v._count.tickets > 0) alerts.push(`${v._count.tickets} דוחות`)
    return alerts
  }

  const filtered = vehicles.filter(v => {
    const s = searchTerm.toLowerCase()
    const match = v.licensePlate.toLowerCase().includes(s) || v.manufacturer.toLowerCase().includes(s) || v.model.toLowerCase().includes(s) ||
      (v.currentDriver && `${v.currentDriver.firstName} ${v.currentDriver.lastName}`.toLowerCase().includes(s))
    return match && (statusFilter === 'all' || v.status === statusFilter)
  })

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'ACTIVE').length,
    unassigned: vehicles.filter(v => v.status === 'ACTIVE' && !v.currentDriver).length,
    withAlerts: vehicles.filter(v => getAlerts(v).length > 0).length,
  }

  const columns: Column<Vehicle>[] = [
    { key: 'licensePlate', label: 'רכב', sortable: true, render: (v: Vehicle) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Car className="text-blue-600" size={20} /></div>
        <div>
          <Link href={`/dashboard/vehicles/${v.id}`} className="text-blue-600 hover:underline font-medium">{v.licensePlate}</Link>
          <div className="text-sm text-gray-500">{v.manufacturer} {v.model} {v.year || ''}</div>
        </div>
      </div>
    )},
    { key: 'currentDriver', label: 'נהג', render: (v: Vehicle) => v.currentDriver ? (
      <Link href={`/dashboard/hr/${v.currentDriver.id}`} className="hover:text-blue-600">{v.currentDriver.firstName} {v.currentDriver.lastName}</Link>
    ) : <span className="text-gray-400">לא משויך</span> },
    { key: 'contractType', label: 'חוזה', render: (v: Vehicle) => (
      <div><span>{v.contractType ? contractLabels[v.contractType] : '-'}</span>{v.leasingCompany && <span className="text-xs text-gray-500 block">{v.leasingCompany}</span>}</div>
    )},
    { key: 'currentKm', label: 'ק"מ', render: (v: Vehicle) => <span>{v.currentKm?.toLocaleString() || '-'}</span> },
    { key: 'alerts', label: 'התראות', render: (v: Vehicle) => {
      const alerts = getAlerts(v)
      if (!alerts.length) return null
      return (
        <div className="relative group">
          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center cursor-pointer"><AlertCircle size={14} className="text-red-600" /></div>
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-20 bg-gray-900 text-white text-xs rounded-lg py-2 px-3">
            {alerts.map((a, i) => <div key={i}>{a}</div>)}
          </div>
        </div>
      )
    }},
    { key: 'status', label: 'סטטוס', render: (v: Vehicle) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[v.status]}`}>{statusLabels[v.status]}</span> },
    { key: 'actions', label: '', render: (v: Vehicle) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/vehicles/${v.id}/edit`) }} className="p-2 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
        <button onClick={(e) => { e.stopPropagation(); setVehicleToDelete(v); setShowDeleteModal(true) }} className="p-2 hover:bg-red-50 rounded-lg text-red-600"><Trash2 size={16} /></button>
      </div>
    )},
  ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Car className="text-blue-600" />ניהול צי רכבים</h1>
          <p className="text-gray-500 mt-1">{stats.total} רכבים | {stats.active} פעילים | {stats.unassigned} זמינים{stats.withAlerts > 0 && <span className="text-red-600"> | {stats.withAlerts} התראות</span>}</p>
        </div>
        <Link href="/dashboard/vehicles/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"><Plus size={20} />רכב חדש</Link>
      </div>

      <div className="bg-white rounded-xl border p-4 mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="חיפוש..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pr-10 pl-4 py-2 border rounded-lg" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded-lg px-4 py-2">
          <option value="all">כל הסטטוסים</option>
          <option value="ACTIVE">פעיל</option>
          <option value="IN_SERVICE">בטיפול</option>
          <option value="RETURNED">הוחזר</option>
          <option value="SOLD">נמכר</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border">
        {loading ? <div className="text-center py-12">טוען...</div> : (
          <SortableTable data={filtered} columns={columns} keyField="id" onRowClick={v => router.push(`/dashboard/vehicles/${v.id}`)} emptyMessage="לא נמצאו רכבים" />
        )}
      </div>

      {showDeleteModal && vehicleToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center"><AlertTriangle className="text-red-600" size={24} /></div>
              <div><h3 className="font-semibold">מחיקת רכב</h3><p className="text-sm text-gray-500">{vehicleToDelete.licensePlate}</p></div>
            </div>
            <p className="text-gray-600 mb-4">האם למחוק את {vehicleToDelete.manufacturer} {vehicleToDelete.model}?</p>
            {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border rounded-lg">ביטול</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50">{deleting ? 'מוחק...' : 'מחק'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

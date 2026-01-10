'use client'

// ============================================
// src/app/dashboard/vehicles/[id]/page.tsx
// Version: 20260110-070000
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Car, User, Fuel, Wrench, AlertTriangle, Edit, ArrowRight, Plus, X, 
  FileWarning, MapPin, Milestone, Trash2, ChevronUp, ChevronDown, ChevronsUpDown,
  FileText, Camera, Eye, Download
} from 'lucide-react'

// ===== Constants =====
const statusLabels: Record<string, string> = { ACTIVE: 'פעיל', IN_SERVICE: 'בטיפול', RETURNED: 'הוחזר', SOLD: 'נמכר' }
const statusColors: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-800', IN_SERVICE: 'bg-yellow-100 text-yellow-800', RETURNED: 'bg-gray-100 text-gray-800', SOLD: 'bg-red-100 text-red-800' }
const contractLabels: Record<string, string> = { RENTAL: 'השכרה', LEASING: 'ליסינג' }
const accidentStatusLabels: Record<string, string> = { OPEN: 'פתוח', IN_PROGRESS: 'בטיפול', CLOSED: 'סגור' }
const accidentStatusColors: Record<string, string> = { OPEN: 'bg-red-100 text-red-800', IN_PROGRESS: 'bg-yellow-100 text-yellow-800', CLOSED: 'bg-green-100 text-green-800' }
const ticketStatusLabels: Record<string, string> = { PENDING: 'ממתין', PAID: 'שולם', APPEALED: 'ערעור', CANCELLED: 'בוטל' }
const ticketStatusColors: Record<string, string> = { PENDING: 'bg-red-100 text-red-800', PAID: 'bg-green-100 text-green-800', APPEALED: 'bg-yellow-100 text-yellow-800', CANCELLED: 'bg-gray-100 text-gray-800' }
const serviceTypes = ['טיפול תקופתי', 'החלפת שמן', 'החלפת צמיגים', 'בלמים', 'תיקון', 'טסט שנתי', 'אחר']
const ticketTypes = ['חניה', 'מהירות', 'רמזור', 'נתיב תח"צ', 'טלפון נייד', 'חגורה', 'אחר']
const tollRoadsList = ['כביש 6', 'מנהרות הכרמל', 'כביש 6 צפון', 'נתיב מהיר', 'אחר']
const documentTypeLabels: Record<string, string> = { LICENSE: 'רישיון רכב', INSURANCE: 'תעודת ביטוח', WINTER_CHECK: 'בדיקת חורף' }
const photoTypeLabels: Record<string, string> = { FRONT: 'חזית', REAR: 'אחור', RIGHT_SIDE: 'צד ימין', LEFT_SIDE: 'צד שמאל', INTERIOR: 'פנים', OTHER: 'אחר' }
const photoEventLabels: Record<string, string> = { HANDOVER_IN: 'קבלה', HANDOVER_OUT: 'מסירה', GENERAL: 'כללי', ACCIDENT: 'תאונה', SERVICE: 'טיפול' }

type SortDirection = 'asc' | 'desc' | null

export default function VehiclePage() {
  const params = useParams()
  const [vehicle, setVehicle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')
  const [employees, setEmployees] = useState<any[]>([])
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [modal, setModal] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null)
  const [handoverPhotos, setHandoverPhotos] = useState<{type: string, file: File | null, preview: string}[]>([
    { type: 'FRONT', file: null, preview: '' },
    { type: 'REAR', file: null, preview: '' },
    { type: 'RIGHT_SIDE', file: null, preview: '' },
    { type: 'RIGHT_SIDE', file: null, preview: '' },
    { type: 'LEFT_SIDE', file: null, preview: '' },
    { type: 'LEFT_SIDE', file: null, preview: '' },
  ])

  // ===== Data Fetching =====
  const fetchVehicle = useCallback(async () => {
    if (!params?.id) return
    try { const r = await fetch(`/api/vehicles/${params.id}`); if (r.ok) setVehicle(await r.json()) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }, [params?.id])

  const fetchDocuments = useCallback(async () => {
    if (!params?.id) return
    try { const r = await fetch(`/api/vehicles/${params.id}/documents`); if (r.ok) setDocuments(await r.json()) }
    catch (e) { console.error(e) }
  }, [params?.id])

  const fetchPhotos = useCallback(async () => {
    if (!params?.id) return
    try { const r = await fetch(`/api/vehicles/${params.id}/photos`); if (r.ok) setPhotos(await r.json()) }
    catch (e) { console.error(e) }
  }, [params?.id])

  useEffect(() => {
    fetchVehicle(); fetchDocuments(); fetchPhotos()
    fetch('/api/hr').then(r => r.json()).then(data => { setAllEmployees(data); setEmployees(data.filter((e: any) => e.status === 'פעיל')) }).catch(() => {})
  }, [fetchVehicle, fetchDocuments, fetchPhotos])

  // ===== Formatters =====
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('he-IL') : '-'
  const formatDateTime = (d: string | null) => { if (!d) return '-'; const date = new Date(d); return date.toLocaleDateString('he-IL') + ' ' + date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) }
  const formatCurrency = (n: number | null | undefined) => n != null ? `₪${n.toLocaleString()}` : '-'
  const toDateTimeLocal = (d: Date | string | null) => { if (!d) return ''; const date = new Date(d); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16) }
  const isExpiringSoon = (d: string | null) => { if (!d) return false; const days = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24); return days <= 30 && days > 0 }
  const isExpired = (d: string | null) => d ? new Date(d) < new Date() : false

  // ===== Sorting =====
  const handleSort = (key: string) => { if (sortKey === key) { if (sortDirection === 'asc') setSortDirection('desc'); else { setSortDirection(null); setSortKey(null) } } else { setSortKey(key); setSortDirection('asc') } }
  const getSortIcon = (key: string) => { if (sortKey !== key) return <ChevronsUpDown size={14} className="text-gray-300" />; return sortDirection === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" /> }
  const sortData = <T extends Record<string, any>>(data: T[], defaultSort?: string): T[] => {
    if (!data) return []; const key = sortKey || defaultSort; const dir = sortDirection || (defaultSort ? 'desc' : null); if (!key || !dir) return data
    return [...data].sort((a, b) => {
      let aVal = key.includes('.') ? key.split('.').reduce((o, k) => o?.[k], a) : a[key]
      let bVal = key.includes('.') ? key.split('.').reduce((o, k) => o?.[k], b) : b[key]
      if (aVal == null && bVal == null) return 0; if (aVal == null) return dir === 'asc' ? 1 : -1; if (bVal == null) return dir === 'asc' ? -1 : 1
      if (typeof aVal === 'string' && typeof bVal === 'string') { if (!isNaN(Date.parse(aVal)) && !isNaN(Date.parse(bVal))) { aVal = new Date(aVal).getTime(); bVal = new Date(bVal).getTime() } else { return dir === 'asc' ? aVal.localeCompare(bVal, 'he') : bVal.localeCompare(aVal, 'he') } }
      if (typeof aVal === 'number' && typeof bVal === 'number') return dir === 'asc' ? aVal - bVal : bVal - aVal
      return 0
    })
  }

  // ===== Form Handlers =====
  const submitForm = async (endpoint: string, e: React.FormEvent<HTMLFormElement>, method = 'POST') => {
    e.preventDefault(); setSaving(true); setError(null)
    const fd = new FormData(e.currentTarget); const data: Record<string, any> = {}
    fd.forEach((v, k) => { data[k] = v === 'on' ? true : v })
    if (editingItem?.id && endpoint === 'assignments') data.assignmentId = editingItem.id
    try {
      const res = await fetch(`/api/vehicles/${params?.id}/${endpoint}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { setModal(null); setEditingItem(null); fetchVehicle(); if (endpoint === 'documents') fetchDocuments(); if (endpoint === 'photos') fetchPhotos() }
      else setError((await res.json()).error || 'שגיאה')
    } catch { setError('שגיאה') } finally { setSaving(false) }
  }

  const handleDelete = async (endpoint: string, itemId: string, confirmMsg: string, paramName = 'assignmentId') => {
    if (!confirm(confirmMsg)) return
    try { const res = await fetch(`/api/vehicles/${params?.id}/${endpoint}?${paramName}=${itemId}`, { method: 'DELETE' }); if (res.ok) { fetchVehicle(); if (endpoint === 'documents') fetchDocuments(); if (endpoint === 'photos') fetchPhotos() } else alert((await res.json()).error || 'שגיאה במחיקה') }
    catch { alert('שגיאה במחיקה') }
  }

  const handleUnassign = async () => { setSaving(true); try { const res = await fetch(`/api/vehicles/${params?.id}/assign`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }); if (res.ok) { setModal(null); fetchVehicle() } } catch {} finally { setSaving(false) } }
  const openEditModal = (type: string, item: any) => { setEditingItem(item); setModal(type); setError(null) }

  // ===== File Upload =====
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    setUploadingFile(true)
    try { const formData = new FormData(); formData.append('file', file); formData.append('folder', folder); const res = await fetch('/api/upload', { method: 'POST', body: formData }); if (res.ok) { const { url } = await res.json(); return url }; return null }
    catch { return null } finally { setUploadingFile(false) }
  }

  const handleDocumentUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true); setError(null)
    const fd = new FormData(e.currentTarget); const file = fd.get('file') as File
    if (!file || file.size === 0) { setError('חובה לבחור קובץ'); setSaving(false); return }
    const fileUrl = await uploadFile(file, `vehicles/${params?.id}/documents`)
    if (!fileUrl) { setError('שגיאה בהעלאת הקובץ'); setSaving(false); return }
    try {
      const res = await fetch(`/api/vehicles/${params?.id}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: fd.get('type'), fileUrl, fileName: file.name, expiryDate: fd.get('expiryDate') || null, issueDate: fd.get('issueDate') || null, notes: fd.get('notes') || null }) })
      if (res.ok) { setModal(null); fetchDocuments() } else setError((await res.json()).error || 'שגיאה')
    } catch { setError('שגיאה') } finally { setSaving(false) }
  }

  const handlePhotoUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true); setError(null)
    const fd = new FormData(e.currentTarget); const file = fd.get('file') as File
    if (!file || file.size === 0) { setError('חובה לבחור תמונה'); setSaving(false); return }
    const fileUrl = await uploadFile(file, `vehicles/${params?.id}/photos`)
    if (!fileUrl) { setError('שגיאה בהעלאת התמונה'); setSaving(false); return }
    try {
      const res = await fetch(`/api/vehicles/${params?.id}/photos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoType: fd.get('photoType'), eventType: fd.get('eventType'), fileUrl, fileName: file.name, takenAt: fd.get('takenAt') || null, notes: fd.get('notes') || null, assignmentId: fd.get('assignmentId') || null }) })
      if (res.ok) { setModal(null); fetchPhotos() } else setError((await res.json()).error || 'שגיאה')
    } catch { setError('שגיאה') } finally { setSaving(false) }
  }

  // ===== Handover Photos =====
  const handleHandoverPhotoSelect = (index: number, file: File | null) => {
    const newPhotos = [...handoverPhotos]
    newPhotos[index] = file ? { ...newPhotos[index], file, preview: URL.createObjectURL(file) } : { ...newPhotos[index], file: null, preview: '' }
    setHandoverPhotos(newPhotos)
  }
  const validateHandoverPhotos = (startDate: string) => {
    if (!startDate) return null
    const start = new Date(startDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // אם התאריך בעבר - לא צריך תמונות
    if (start < today) return null
    // אם התאריך היום או עתידי - חובה 6 תמונות
    const filled = handoverPhotos.filter(p => p.file !== null).length
    return filled < 6 ? 'חובה להעלות 6 תמונות: חזית, אחור, 2 צד ימין, 2 צד שמאל' : null
  }
  const resetHandoverPhotos = () => setHandoverPhotos([{ type: 'FRONT', file: null, preview: '' }, { type: 'REAR', file: null, preview: '' }, { type: 'RIGHT_SIDE', file: null, preview: '' }, { type: 'RIGHT_SIDE', file: null, preview: '' }, { type: 'LEFT_SIDE', file: null, preview: '' }, { type: 'LEFT_SIDE', file: null, preview: '' }])

  if (loading) return <div className="p-8 text-center">טוען...</div>
  if (!vehicle) return <div className="p-8 text-center">רכב לא נמצא</div>

  const tabs = [
    { id: 'details', label: 'פרטים', icon: Car },
    { id: 'assignments', label: `היסטוריה (${vehicle.assignments?.length || 0})`, icon: User },
    { id: 'documents', label: `מסמכים (${documents.length})`, icon: FileText },
    { id: 'photos', label: `תמונות (${photos.length})`, icon: Camera },
    { id: 'services', label: `טיפולים (${vehicle.services?.length || 0})`, icon: Wrench },
    { id: 'accidents', label: `תאונות (${vehicle.accidents?.length || 0})`, icon: AlertTriangle },
    { id: 'fuel', label: `דלק (${vehicle.fuelLogs?.length || 0})`, icon: Fuel },
    { id: 'tolls', label: `אגרה (${vehicle.tollRoads?.length || 0})`, icon: Milestone },
    { id: 'parking', label: `חניות (${vehicle.parkings?.length || 0})`, icon: MapPin },
    { id: 'tickets', label: `דוחות (${vehicle.tickets?.length || 0})`, icon: FileWarning },
  ]

  const SortHeader = ({ k, label, className = '' }: { k: string; label: string; className?: string }) => (
    <th className={`text-right p-2 cursor-pointer hover:bg-gray-100 select-none ${className}`} onClick={() => handleSort(k)}>
      <div className="flex items-center gap-1">{label}{getSortIcon(k)}</div>
    </th>
  )

  const groupedDocuments = documents.reduce((acc: any, doc: any) => { if (!acc[doc.type]) acc[doc.type] = []; acc[doc.type].push(doc); return acc }, {})

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/dashboard/vehicles" className="text-blue-600 hover:underline text-sm flex items-center gap-1 mb-2"><ArrowRight size={14} /> חזרה</Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center"><Car className="text-blue-600" size={32} /></div>
            <div><h1 className="text-2xl font-bold">{vehicle.manufacturer} {vehicle.model} - {vehicle.licensePlate}</h1><p className="text-gray-500">{vehicle.year} • {vehicle.color}</p></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm ${statusColors[vehicle.status]}`}>{statusLabels[vehicle.status]}</span>
          <Link href={`/dashboard/vehicles/${vehicle.id}/edit`} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Edit size={16} /> עריכה</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mb-6 text-sm">
        {[{ label: 'ק"מ', value: vehicle.currentKm?.toLocaleString() || '-' }, { label: 'צריכה', value: vehicle.stats?.avgFuelConsumption > 0 ? vehicle.stats.avgFuelConsumption : '-' }, { label: 'דלק', value: formatCurrency(vehicle.stats?.totalFuelCost) }, { label: 'טיפולים', value: formatCurrency(vehicle.stats?.totalServiceCost) }, { label: 'תאונות', value: formatCurrency(vehicle.stats?.totalAccidentCost) }, { label: 'אגרה', value: formatCurrency(vehicle.stats?.totalTollCost) }, { label: 'חניות', value: formatCurrency(vehicle.stats?.totalParkingCost) }, { label: 'דוחות', value: formatCurrency(vehicle.stats?.totalTicketsCost), alert: vehicle.stats?.pendingTickets > 0 }].map((s, i) => <div key={i} className="bg-white rounded-lg p-3 border"><div className="text-gray-500 text-xs">{s.label}</div><div className={`font-bold ${s.alert ? 'text-red-600' : ''}`}>{s.value}</div></div>)}
      </div>

      {/* Tabs */}
      <div className="border-b mb-6 flex gap-1 overflow-x-auto">
        {tabs.map(t => <button key={t.id} onClick={() => { setActiveTab(t.id); setSortKey(null); setSortDirection(null) }} className={`px-3 py-2 border-b-2 whitespace-nowrap flex items-center gap-1 text-sm ${activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><t.icon size={14} />{t.label}</button>)}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border p-6">
        {/* Tab: Details */}
        {activeTab === 'details' && (
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-3">פרטי רכב</h3>
              <dl className="space-y-2 text-sm">{[['מספר רישוי', vehicle.licensePlate], ['יצרן', vehicle.manufacturer], ['דגם', vehicle.model], ['שנה', vehicle.year], ['צבע', vehicle.color], ['ק"מ', vehicle.currentKm?.toLocaleString()]].map(([l, v]) => <div key={l} className="flex justify-between"><dt className="text-gray-500">{l}</dt><dd>{v || '-'}</dd></div>)}</dl>
              <h3 className="font-semibold mt-6 mb-3">תחזוקה</h3>
              <dl className="space-y-2 text-sm">{[['טיפול אחרון', formatDate(vehicle.lastServiceDate)], ['טיפול הבא', formatDate(vehicle.nextServiceDate)]].map(([l, v]) => <div key={l} className="flex justify-between"><dt className="text-gray-500">{l}</dt><dd>{v}</dd></div>)}</dl>
            </div>
            <div>
              <h3 className="font-semibold mb-3">חוזה</h3>
              <dl className="space-y-2 text-sm">{[['סוג', vehicle.contractType ? contractLabels[vehicle.contractType] : '-'], ['חברה', vehicle.leasingCompany], ['תחילה', formatDate(vehicle.contractStartDate)], ['סיום', formatDate(vehicle.contractEndDate)], ['עלות חודשית', formatCurrency(vehicle.monthlyPayment)]].map(([l, v]) => <div key={l} className="flex justify-between"><dt className="text-gray-500">{l}</dt><dd>{v || '-'}</dd></div>)}</dl>
              <h3 className="font-semibold mt-6 mb-3">נהג נוכחי</h3>
              {vehicle.currentDriver ? <div className="flex justify-between"><Link href={`/dashboard/hr/${vehicle.currentDriver.id}`} className="text-blue-600">{vehicle.currentDriver.firstName} {vehicle.currentDriver.lastName}</Link><button onClick={() => setModal('unassign')} className="text-red-600 text-sm">בטל שיוך</button></div> : <div className="flex justify-between"><span className="text-gray-400">לא משויך</span><button onClick={() => { resetHandoverPhotos(); setModal('assign') }} className="text-blue-600 text-sm">שייך לעובד</button></div>}
            </div>
          </div>
        )}

        {/* Tab: Assignments */}
        {activeTab === 'assignments' && (
          <div>
            <div className="flex justify-between mb-4"><h3 className="font-semibold">היסטוריית שיוך</h3><button onClick={() => { setEditingItem(null); resetHandoverPhotos(); setModal('assignment') }} className="text-blue-600 text-sm flex items-center gap-1"><Plus size={14} />הוסף שיוך</button></div>
            {!vehicle.assignments?.length ? <p className="text-gray-500 text-center py-8">אין היסטוריה</p> : (
              <div className="overflow-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><SortHeader k="employee.firstName" label="עובד" /><SortHeader k="startDate" label="מתאריך ושעה" /><SortHeader k="endDate" label="עד תאריך ושעה" /><SortHeader k="startKm" label='ק"מ התחלה' /><SortHeader k="endKm" label='ק"מ סיום' /><th className="text-right p-2">תמונות</th><th className="text-right p-2">הערות</th><th className="text-right p-2 w-20">פעולות</th></tr></thead>
                <tbody>{sortData(vehicle.assignments, 'startDate').map((a: any) => { const assignmentPhotos = photos.filter((p: any) => p.assignmentId === a.id); return (
                  <tr key={a.id} className="border-t hover:bg-gray-50">
                    <td className="p-2"><Link href={`/dashboard/hr/${a.employee.id}`} className="text-blue-600">{a.employee.firstName} {a.employee.lastName}</Link></td>
                    <td className="p-2">{formatDateTime(a.startDate)}</td>
                    <td className="p-2">{a.endDate ? formatDateTime(a.endDate) : <span className="text-green-600 font-medium">נוכחי</span>}</td>
                    <td className="p-2">{a.startKm?.toLocaleString() || '-'}</td>
                    <td className="p-2">{a.endKm?.toLocaleString() || '-'}</td>
                    <td className="p-2">{assignmentPhotos.length > 0 ? <button onClick={() => setActiveTab('photos')} className="text-blue-600 flex items-center gap-1"><Camera size={14} /> {assignmentPhotos.length}</button> : <span className="text-gray-400">-</span>}</td>
                    <td className="p-2 text-gray-500 text-xs max-w-32 truncate" title={a.notes}>{a.notes || '-'}</td>
                    <td className="p-2"><div className="flex items-center gap-1"><button onClick={() => openEditModal('assignment', a)} className="p-1 text-gray-400 hover:text-blue-600" title="עריכה"><Edit size={14} /></button><button onClick={() => handleDelete('assignments', a.id, `למחוק את השיוך של ${a.employee.firstName} ${a.employee.lastName}?`)} className="p-1 text-gray-400 hover:text-red-600" title="מחיקה"><Trash2 size={14} /></button></div></td>
                  </tr>
                )})}</tbody></table></div>
            )}
          </div>
        )}

        {/* Tab: Documents */}
        {activeTab === 'documents' && (
          <div>
            <div className="flex justify-between mb-4"><h3 className="font-semibold">מסמכי רכב</h3><button onClick={() => { setEditingItem(null); setModal('document') }} className="text-blue-600 text-sm flex items-center gap-1"><Plus size={14} />הוסף מסמך</button></div>
            {documents.length === 0 ? <p className="text-gray-500 text-center py-8">אין מסמכים</p> : (
              <div className="space-y-6">
                {(['LICENSE', 'INSURANCE', 'WINTER_CHECK'] as const).map(type => (
                  <div key={type}>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2"><FileText size={16} />{documentTypeLabels[type]}<span className="text-gray-400 text-sm">({groupedDocuments[type]?.length || 0})</span></h4>
                    {!groupedDocuments[type]?.length ? <p className="text-gray-400 text-sm mr-6">לא הועלו מסמכים</p> : (
                      <div className="overflow-auto mr-6"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><SortHeader k="fileName" label="שם קובץ" /><SortHeader k="issueDate" label="תאריך הנפקה" /><SortHeader k="expiryDate" label="תוקף" /><th className="text-right p-2">הערות</th><th className="text-right p-2 w-24">פעולות</th></tr></thead>
                        <tbody>{sortData(groupedDocuments[type], 'expiryDate').map((doc: any) => (
                          <tr key={doc.id} className="border-t hover:bg-gray-50">
                            <td className="p-2">{doc.fileName}</td>
                            <td className="p-2">{formatDate(doc.issueDate)}</td>
                            <td className="p-2"><span className={`${isExpired(doc.expiryDate) ? 'text-red-600 font-medium' : isExpiringSoon(doc.expiryDate) ? 'text-yellow-600 font-medium' : ''}`}>{formatDate(doc.expiryDate)}{isExpired(doc.expiryDate) && ' (פג תוקף)'}{isExpiringSoon(doc.expiryDate) && ' (בקרוב)'}</span></td>
                            <td className="p-2 text-gray-500 text-xs">{doc.notes || '-'}</td>
                            <td className="p-2"><div className="flex items-center gap-1"><a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-blue-600" title="צפייה"><Eye size={14} /></a><a href={doc.fileUrl} download className="p-1 text-gray-400 hover:text-green-600" title="הורדה"><Download size={14} /></a><button onClick={() => handleDelete('documents', doc.id, 'למחוק את המסמך?', 'documentId')} className="p-1 text-gray-400 hover:text-red-600" title="מחיקה"><Trash2 size={14} /></button></div></td>
                          </tr>
                        ))}</tbody></table></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Photos */}
        {activeTab === 'photos' && (
          <div>
            <div className="flex justify-between mb-4"><h3 className="font-semibold">תמונות רכב</h3><button onClick={() => { setEditingItem(null); setModal('photo') }} className="text-blue-600 text-sm flex items-center gap-1"><Plus size={14} />הוסף תמונה</button></div>
            {photos.length === 0 ? <p className="text-gray-500 text-center py-8">אין תמונות</p> : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {sortData(photos, 'takenAt').map((photo: any) => (
                  <div key={photo.id} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer" onClick={() => setSelectedPhoto(photo)}><img src={photo.fileUrl} alt={photo.fileName} className="w-full h-full object-cover" /></div>
                    <div className="absolute top-2 right-2"><span className={`text-xs px-1.5 py-0.5 rounded ${photo.eventType === 'HANDOVER_IN' ? 'bg-green-100 text-green-700' : photo.eventType === 'HANDOVER_OUT' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{photoEventLabels[photo.eventType]}</span></div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"><div>{photoTypeLabels[photo.photoType]}</div><div>{formatDate(photo.takenAt)}</div>{photo.assignment && <div>{photo.assignment.employee.firstName} {photo.assignment.employee.lastName}</div>}</div>
                    <button onClick={() => handleDelete('photos', photo.id, 'למחוק את התמונה?', 'photoId')} className="absolute top-2 left-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Services */}
        {activeTab === 'services' && (
          <div>
            <div className="flex justify-between mb-4"><h3 className="font-semibold">טיפולים</h3><button onClick={() => { setEditingItem(null); setModal('service') }} className="text-blue-600 text-sm flex items-center gap-1"><Plus size={14} />הוסף</button></div>
            {!vehicle.services?.length ? <p className="text-gray-500 text-center py-8">אין טיפולים</p> : (
              <div className="overflow-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><SortHeader k="serviceDate" label="תאריך" /><SortHeader k="serviceType" label="סוג" /><SortHeader k="mileage" label='ק"מ' /><SortHeader k="cost" label="עלות" /><SortHeader k="garage" label="מוסך" /></tr></thead><tbody>{sortData(vehicle.services, 'serviceDate').map((s: any) => <tr key={s.id} className="border-t hover:bg-gray-50"><td className="p-2">{formatDate(s.serviceDate)}</td><td className="p-2">{s.serviceType}</td><td className="p-2">{s.mileage?.toLocaleString() || '-'}</td><td className="p-2">{formatCurrency(s.cost)}</td><td className="p-2">{s.garage || '-'}</td></tr>)}</tbody></table></div>
            )}
          </div>
        )}

        {/* Tab: Accidents */}
        {activeTab === 'accidents' && (
          <div>
            <div className="flex justify-between mb-4"><h3 className="font-semibold">תאונות</h3><button onClick={() => { setEditingItem(null); setModal('accident') }} className="text-blue-600 text-sm flex items-center gap-1"><Plus size={14} />הוסף</button></div>
            {!vehicle.accidents?.length ? <p className="text-gray-500 text-center py-8">אין תאונות</p> : (
              <div className="overflow-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><SortHeader k="date" label="תאריך" /><SortHeader k="employee.firstName" label="עובד" /><SortHeader k="location" label="מיקום" /><SortHeader k="cost" label="עלות" /><SortHeader k="status" label="סטטוס" /></tr></thead><tbody>{sortData(vehicle.accidents, 'date').map((a: any) => <tr key={a.id} className="border-t hover:bg-gray-50"><td className="p-2">{formatDate(a.date)}</td><td className="p-2">{a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : '-'}</td><td className="p-2">{a.location || '-'}</td><td className="p-2">{formatCurrency(a.cost)}</td><td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${accidentStatusColors[a.status] || 'bg-gray-100'}`}>{accidentStatusLabels[a.status] || a.status}</span></td></tr>)}</tbody></table></div>
            )}
          </div>
        )}

        {/* Tab: Fuel */}
        {activeTab === 'fuel' && (
          <div>
            <div className="flex justify-between mb-4"><h3 className="font-semibold">תדלוקים</h3><button onClick={() => { setEditingItem(null); setModal('fuel') }} className="text-blue-600 text-sm flex items-center gap-1"><Plus size={14} />הוסף</button></div>
            {!vehicle.fuelLogs?.length ? <p className="text-gray-500 text-center py-8">אין תדלוקים</p> : (
              <div className="overflow-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><SortHeader k="date" label="תאריך" /><SortHeader k="employee.firstName" label="עובד" /><SortHeader k="liters" label="ליטרים" /><SortHeader k="totalCost" label="עלות" /><SortHeader k="mileage" label='ק"מ' /><SortHeader k="station" label="תחנה" /></tr></thead><tbody>{sortData(vehicle.fuelLogs, 'date').map((f: any) => <tr key={f.id} className="border-t hover:bg-gray-50"><td className="p-2">{formatDate(f.date)}</td><td className="p-2">{f.employee ? `${f.employee.firstName} ${f.employee.lastName}` : '-'}</td><td className="p-2">{f.liters.toFixed(1)}</td><td className="p-2">{formatCurrency(f.totalCost)}</td><td className="p-2">{f.mileage?.toLocaleString() || '-'}</td><td className="p-2">{f.station || '-'}</td></tr>)}</tbody></table></div>
            )}
          </div>
        )}

        {/* Tab: Tolls */}
        {activeTab === 'tolls' && (
          <div>
            <div className="flex justify-between mb-4"><h3 className="font-semibold">כבישי אגרה</h3><button onClick={() => { setEditingItem(null); setModal('toll') }} className="text-blue-600 text-sm flex items-center gap-1"><Plus size={14} />הוסף</button></div>
            {!vehicle.tollRoads?.length ? <p className="text-gray-500 text-center py-8">אין נסיעות</p> : (
              <div className="overflow-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><SortHeader k="date" label="תאריך" /><SortHeader k="employee.firstName" label="עובד" /><SortHeader k="road" label="כביש" /><SortHeader k="entryPoint" label="כניסה" /><SortHeader k="exitPoint" label="יציאה" /><SortHeader k="cost" label="עלות" /></tr></thead><tbody>{sortData(vehicle.tollRoads, 'date').map((t: any) => <tr key={t.id} className="border-t hover:bg-gray-50"><td className="p-2">{formatDate(t.date)}</td><td className="p-2">{t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : '-'}</td><td className="p-2">{t.road}</td><td className="p-2">{t.entryPoint || '-'}</td><td className="p-2">{t.exitPoint || '-'}</td><td className="p-2">{formatCurrency(t.cost)}</td></tr>)}</tbody></table></div>
            )}
          </div>
        )}

        {/* Tab: Parking */}
        {activeTab === 'parking' && (
          <div>
            <div className="flex justify-between mb-4"><h3 className="font-semibold">חניות</h3><button onClick={() => { setEditingItem(null); setModal('parking') }} className="text-blue-600 text-sm flex items-center gap-1"><Plus size={14} />הוסף</button></div>
            {!vehicle.parkings?.length ? <p className="text-gray-500 text-center py-8">אין חניות</p> : (
              <div className="overflow-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><SortHeader k="date" label="תאריך" /><SortHeader k="employee.firstName" label="עובד" /><SortHeader k="location" label="מיקום" /><SortHeader k="parkingLot" label="חניון" /><SortHeader k="cost" label="עלות" /></tr></thead><tbody>{sortData(vehicle.parkings, 'date').map((p: any) => <tr key={p.id} className="border-t hover:bg-gray-50"><td className="p-2">{formatDate(p.date)}</td><td className="p-2">{p.employee ? `${p.employee.firstName} ${p.employee.lastName}` : '-'}</td><td className="p-2">{p.location}</td><td className="p-2">{p.parkingLot || '-'}</td><td className="p-2">{formatCurrency(p.cost)}</td></tr>)}</tbody></table></div>
            )}
          </div>
        )}

        {/* Tab: Tickets */}
        {activeTab === 'tickets' && (
          <div>
            <div className="flex justify-between mb-4"><h3 className="font-semibold">דוחות</h3><button onClick={() => { setEditingItem(null); setModal('ticket') }} className="text-blue-600 text-sm flex items-center gap-1"><Plus size={14} />הוסף</button></div>
            {!vehicle.tickets?.length ? <p className="text-gray-500 text-center py-8">אין דוחות</p> : (
              <div className="overflow-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><SortHeader k="date" label="תאריך" /><SortHeader k="employee.firstName" label="עובד" /><SortHeader k="ticketType" label="סוג" /><SortHeader k="location" label="מיקום" /><SortHeader k="fineAmount" label="קנס" /><SortHeader k="points" label="נקודות" /><SortHeader k="status" label="סטטוס" /></tr></thead><tbody>{sortData(vehicle.tickets, 'date').map((t: any) => <tr key={t.id} className="border-t hover:bg-gray-50"><td className="p-2">{formatDate(t.date)}</td><td className="p-2">{t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : '-'}</td><td className="p-2">{t.ticketType}</td><td className="p-2">{t.location || '-'}</td><td className="p-2">{formatCurrency(t.fineAmount)}</td><td className="p-2">{t.points || '-'}</td><td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${ticketStatusColors[t.status]}`}>{ticketStatusLabels[t.status]}</span></td></tr>)}</tbody></table></div>
            )}
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}

      {/* Photo Viewer */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setSelectedPhoto(null)}>
          <div className="max-w-4xl max-h-[90vh] p-4" onClick={e => e.stopPropagation()}>
            <img src={selectedPhoto.fileUrl} alt={selectedPhoto.fileName} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            <div className="mt-4 text-white text-center"><div className="text-lg">{photoTypeLabels[selectedPhoto.photoType]} - {photoEventLabels[selectedPhoto.eventType]}</div><div>{formatDateTime(selectedPhoto.takenAt)}</div>{selectedPhoto.assignment && <div>{selectedPhoto.assignment.employee.firstName} {selectedPhoto.assignment.employee.lastName}</div>}{selectedPhoto.notes && <div className="text-gray-300 mt-2">{selectedPhoto.notes}</div>}</div>
            <button onClick={() => setSelectedPhoto(null)} className="absolute top-4 right-4 text-white hover:text-gray-300"><X size={32} /></button>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {/* Assign Modal - שיוך מהיר (מהיום, חובה תמונות) */}
      {modal === 'assign' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">שיוך לעובד</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={async (e) => { e.preventDefault(); const photoError = validateHandoverPhotos(new Date().toISOString()); if (photoError) { setError(photoError); return }; await submitForm('assign', e) }} className="space-y-4">
            <div><label className="block text-sm mb-1">עובד *</label><select name="employeeId" required className="w-full border rounded p-2"><option value="">בחר</option>{employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select></div>
            <div><label className="block text-sm mb-1">ק"מ</label><input type="number" name="currentKm" defaultValue={vehicle.currentKm || ''} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-2 font-medium">תמונות קבלה (חובה 6 תמונות) *</label>
              <div className="grid grid-cols-3 gap-3">{handoverPhotos.map((photo, idx) => (
                <div key={idx} className="relative">
                  <div className="text-xs text-gray-500 mb-1">{idx === 0 ? 'חזית' : idx === 1 ? 'אחור' : idx < 4 ? 'צד ימין' : 'צד שמאל'}</div>
                  <label className={`aspect-video border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 ${photo.preview ? 'border-green-500' : 'border-gray-300'}`}>
                    {photo.preview ? <img src={photo.preview} className="w-full h-full object-cover rounded-lg" /> : <div className="text-center text-gray-400"><Camera size={24} className="mx-auto mb-1" /><span className="text-xs">לחץ להעלאה</span></div>}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleHandoverPhotoSelect(idx, e.target.files?.[0] || null)} />
                  </label>
                  {photo.preview && <button type="button" onClick={() => handleHandoverPhotoSelect(idx, null)} className="absolute top-5 right-1 p-1 bg-red-500 text-white rounded-full"><X size={12} /></button>}
                </div>
              ))}</div>
              <p className="text-xs text-gray-500 mt-2">יש להעלות: 1 חזית, 1 אחור, 2 צד ימין, 2 צד שמאל</p>
            </div>
            <div className="flex gap-3 justify-end pt-4"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button type="submit" disabled={saving || uploadingFile} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving || uploadingFile ? 'שומר...' : 'שייך'}</button></div>
          </form>
        </div></div>
      )}

      {/* Unassign Modal */}
      {modal === 'unassign' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <h3 className="font-semibold mb-4">ביטול שיוך</h3><p className="mb-4">לבטל שיוך מ-{vehicle.currentDriver?.firstName} {vehicle.currentDriver?.lastName}?</p>
          <div className="flex gap-3 justify-end"><button onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button onClick={handleUnassign} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50">{saving ? 'מבטל...' : 'בטל'}</button></div>
        </div></div>
      )}

      {/* Assignment Modal (Historical) */}
      {modal === 'assignment' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">{editingItem ? 'עריכת שיוך' : 'הוספת שיוך היסטורי'}</h3><button onClick={() => { setModal(null); setEditingItem(null) }}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={e => submitForm('assignments', e, editingItem ? 'PUT' : 'POST')} className="space-y-4">
            <div><label className="block text-sm mb-1">עובד *</label><select name="employeeId" required defaultValue={editingItem?.employeeId || ''} className="w-full border rounded p-2"><option value="">בחר עובד</option>{allEmployees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} {e.status !== 'פעיל' ? `(${e.status})` : ''}</option>)}</select><p className="text-xs text-gray-500 mt-1">ניתן לבחור גם עובדים לא פעילים להזנת היסטוריה</p></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">תאריך ושעת התחלה *</label><input type="datetime-local" name="startDate" required defaultValue={editingItem ? toDateTimeLocal(editingItem.startDate) : ''} className="w-full border rounded p-2" /></div><div><label className="block text-sm mb-1">תאריך ושעת סיום</label><input type="datetime-local" name="endDate" defaultValue={editingItem?.endDate ? toDateTimeLocal(editingItem.endDate) : ''} className="w-full border rounded p-2" /><p className="text-xs text-gray-500 mt-1">השאר ריק אם זה השיוך הנוכחי</p></div></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">ק"מ בהתחלה</label><input type="number" name="startKm" defaultValue={editingItem?.startKm || ''} className="w-full border rounded p-2" /></div><div><label className="block text-sm mb-1">ק"מ בסיום</label><input type="number" name="endKm" defaultValue={editingItem?.endKm || ''} className="w-full border rounded p-2" /></div></div>
            <div><label className="block text-sm mb-1">הערות</label><input name="notes" defaultValue={editingItem?.notes || ''} className="w-full border rounded p-2" placeholder="הערות לשיוך זה..." /></div>
            <div className="flex gap-3 justify-end pt-2"><button type="button" onClick={() => { setModal(null); setEditingItem(null) }} className="px-4 py-2 border rounded">ביטול</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'שומר...' : (editingItem ? 'עדכן' : 'הוסף')}</button></div>
          </form>
        </div></div>
      )}

      {/* Document Modal */}
      {modal === 'document' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">העלאת מסמך</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleDocumentUpload} className="space-y-4">
            <div><label className="block text-sm mb-1">סוג מסמך *</label><select name="type" required className="w-full border rounded p-2"><option value="">בחר</option><option value="LICENSE">רישיון רכב</option><option value="INSURANCE">תעודת ביטוח</option><option value="WINTER_CHECK">בדיקת חורף שנתית</option></select></div>
            <div><label className="block text-sm mb-1">קובץ *</label><input type="file" name="file" required accept=".pdf,.jpg,.jpeg,.png" className="w-full border rounded p-2" /></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">תאריך הנפקה</label><input type="date" name="issueDate" className="w-full border rounded p-2" /></div><div><label className="block text-sm mb-1">תוקף</label><input type="date" name="expiryDate" className="w-full border rounded p-2" /></div></div>
            <div><label className="block text-sm mb-1">הערות</label><input name="notes" className="w-full border rounded p-2" /></div>
            <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button type="submit" disabled={saving || uploadingFile} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving || uploadingFile ? 'מעלה...' : 'העלה'}</button></div>
          </form>
        </div></div>
      )}

      {/* Photo Modal */}
      {modal === 'photo' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">העלאת תמונה</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handlePhotoUpload} className="space-y-4">
            <div><label className="block text-sm mb-1">סוג תמונה *</label><select name="photoType" required className="w-full border rounded p-2"><option value="">בחר</option><option value="FRONT">חזית</option><option value="REAR">אחור</option><option value="RIGHT_SIDE">צד ימין</option><option value="LEFT_SIDE">צד שמאל</option><option value="INTERIOR">פנים</option><option value="OTHER">אחר</option></select></div>
            <div><label className="block text-sm mb-1">סוג אירוע *</label><select name="eventType" required className="w-full border rounded p-2"><option value="">בחר</option><option value="GENERAL">כללי</option><option value="HANDOVER_IN">קבלה</option><option value="HANDOVER_OUT">מסירה</option><option value="ACCIDENT">תאונה</option><option value="SERVICE">טיפול</option></select></div>
            <div><label className="block text-sm mb-1">תמונה *</label><input type="file" name="file" required accept="image/*" className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">תאריך צילום</label><input type="datetime-local" name="takenAt" className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">שיוך (לתמונות קבלה/מסירה)</label><select name="assignmentId" className="w-full border rounded p-2"><option value="">ללא שיוך</option>{vehicle.assignments?.map((a: any) => <option key={a.id} value={a.id}>{a.employee.firstName} {a.employee.lastName} ({formatDate(a.startDate)})</option>)}</select></div>
            <div><label className="block text-sm mb-1">הערות</label><input name="notes" className="w-full border rounded p-2" /></div>
            <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button type="submit" disabled={saving || uploadingFile} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving || uploadingFile ? 'מעלה...' : 'העלה'}</button></div>
          </form>
        </div></div>
      )}

      {/* Service Modal */}
      {modal === 'service' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">הוספת טיפול</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={e => submitForm('services', e)} className="space-y-4">
            <div><label className="block text-sm mb-1">תאריך *</label><input type="date" name="serviceDate" required className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">סוג *</label><select name="serviceType" required className="w-full border rounded p-2"><option value="">בחר</option>{serviceTypes.map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">ק"מ</label><input type="number" name="mileage" defaultValue={vehicle.currentKm || ''} className="w-full border rounded p-2" /></div><div><label className="block text-sm mb-1">עלות ₪</label><input type="number" name="cost" className="w-full border rounded p-2" /></div></div>
            <div><label className="block text-sm mb-1">מוסך</label><input name="garage" className="w-full border rounded p-2" /></div>
            <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'שומר...' : 'הוסף'}</button></div>
          </form>
        </div></div>
      )}

      {/* Accident Modal */}
      {modal === 'accident' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">הוספת תאונה</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={e => submitForm('accidents', e)} className="space-y-4">
            <div><label className="block text-sm mb-1">תאריך *</label><input type="date" name="date" required className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">עובד</label><select name="employeeId" className="w-full border rounded p-2"><option value="">לפי שיוך בתאריך</option>{allEmployees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select></div>
            <div><label className="block text-sm mb-1">מיקום</label><input name="location" className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">תיאור</label><textarea name="description" rows={2} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">עלות ₪</label><input type="number" name="cost" className="w-full border rounded p-2" /></div>
            <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'שומר...' : 'הוסף'}</button></div>
          </form>
        </div></div>
      )}

      {/* Fuel Modal */}
      {modal === 'fuel' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">הוספת תדלוק</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={e => submitForm('fuel', e)} className="space-y-4">
            <div><label className="block text-sm mb-1">תאריך *</label><input type="date" name="date" required className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">עובד</label><select name="employeeId" className="w-full border rounded p-2"><option value="">לפי שיוך בתאריך</option>{allEmployees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">ליטרים *</label><input type="number" step="0.1" name="liters" required className="w-full border rounded p-2" /></div><div><label className="block text-sm mb-1">עלות ₪ *</label><input type="number" name="totalCost" required className="w-full border rounded p-2" /></div></div>
            <div><label className="block text-sm mb-1">ק"מ</label><input type="number" name="mileage" defaultValue={vehicle.currentKm || ''} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">תחנה</label><input name="station" className="w-full border rounded p-2" /></div>
            <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'שומר...' : 'הוסף'}</button></div>
          </form>
        </div></div>
      )}

      {/* Toll Modal */}
      {modal === 'toll' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">הוספת כביש אגרה</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={e => submitForm('tolls', e)} className="space-y-4">
            <div><label className="block text-sm mb-1">תאריך *</label><input type="date" name="date" required className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">עובד</label><select name="employeeId" className="w-full border rounded p-2"><option value="">לפי שיוך בתאריך</option>{allEmployees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select></div>
            <div><label className="block text-sm mb-1">כביש *</label><select name="road" required className="w-full border rounded p-2"><option value="">בחר</option>{tollRoadsList.map(r => <option key={r}>{r}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">כניסה</label><input name="entryPoint" className="w-full border rounded p-2" /></div><div><label className="block text-sm mb-1">יציאה</label><input name="exitPoint" className="w-full border rounded p-2" /></div></div>
            <div><label className="block text-sm mb-1">עלות ₪ *</label><input type="number" step="0.01" name="cost" required className="w-full border rounded p-2" /></div>
            <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'שומר...' : 'הוסף'}</button></div>
          </form>
        </div></div>
      )}

      {/* Parking Modal */}
      {modal === 'parking' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">הוספת חניה</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={e => submitForm('parking', e)} className="space-y-4">
            <div><label className="block text-sm mb-1">תאריך *</label><input type="date" name="date" required className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">עובד</label><select name="employeeId" className="w-full border rounded p-2"><option value="">לפי שיוך בתאריך</option>{allEmployees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select></div>
            <div><label className="block text-sm mb-1">מיקום *</label><input name="location" required className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">חניון</label><input name="parkingLot" className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">עלות ₪ *</label><input type="number" step="0.01" name="cost" required className="w-full border rounded p-2" /></div>
            <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'שומר...' : 'הוסף'}</button></div>
          </form>
        </div></div>
      )}

      {/* Ticket Modal */}
      {modal === 'ticket' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">הוספת דוח</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={e => submitForm('tickets', e)} className="space-y-4">
            <div><label className="block text-sm mb-1">תאריך עבירה *</label><input type="date" name="date" required className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">עובד</label><select name="employeeId" className="w-full border rounded p-2"><option value="">לפי שיוך בתאריך</option>{allEmployees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select></div>
            <div><label className="block text-sm mb-1">סוג דוח *</label><select name="ticketType" required className="w-full border rounded p-2"><option value="">בחר</option>{ticketTypes.map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className="block text-sm mb-1">מיקום</label><input name="location" className="w-full border rounded p-2" /></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">קנס ₪ *</label><input type="number" name="fineAmount" required className="w-full border rounded p-2" /></div><div><label className="block text-sm mb-1">נקודות</label><input type="number" name="points" className="w-full border rounded p-2" /></div></div>
            <div><label className="block text-sm mb-1">תאריך אחרון לתשלום</label><input type="date" name="dueDate" className="w-full border rounded p-2" /></div>
            <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'שומר...' : 'הוסף'}</button></div>
          </form>
        </div></div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Car, User, Gauge, Fuel, Wrench, AlertTriangle, Edit, ArrowRight, Plus, X, FileWarning, MapPin, Route } from 'lucide-react'

const statusLabels: Record<string, string> = { ACTIVE: 'פעיל', IN_SERVICE: 'בטיפול', RETURNED: 'הוחזר', SOLD: 'נמכר' }
const statusColors: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-800', IN_SERVICE: 'bg-yellow-100 text-yellow-800', RETURNED: 'bg-gray-100 text-gray-800', SOLD: 'bg-red-100 text-red-800' }
const contractLabels: Record<string, string> = { RENTAL: 'השכרה', LEASING: 'ליסינג' }
const accidentStatusColors: Record<string, string> = { OPEN: 'bg-red-100 text-red-800', IN_PROGRESS: 'bg-yellow-100 text-yellow-800', CLOSED: 'bg-green-100 text-green-800' }
const ticketStatusLabels: Record<string, string> = { PENDING: 'ממתין', PAID: 'שולם', APPEALED: 'ערעור', CANCELLED: 'בוטל' }
const ticketStatusColors: Record<string, string> = { PENDING: 'bg-red-100 text-red-800', PAID: 'bg-green-100 text-green-800', APPEALED: 'bg-yellow-100 text-yellow-800', CANCELLED: 'bg-gray-100 text-gray-800' }
const serviceTypes = ['טיפול תקופתי', 'החלפת שמן', 'החלפת צמיגים', 'בלמים', 'תיקון', 'טסט שנתי', 'אחר']
const ticketTypes = ['חניה', 'מהירות', 'רמזור', 'נתיב תח"צ', 'טלפון נייד', 'חגורה', 'אחר']
const tollRoadsList = ['כביש 6', 'מנהרות הכרמל', 'כביש 6 צפון', 'נתיב מהיר', 'אחר']

export default function VehiclePage() {
  const params = useParams()
  const [vehicle, setVehicle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')
  const [employees, setEmployees] = useState<any[]>([])
  const [modal, setModal] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVehicle = useCallback(async () => {
    if (!params?.id) return
    try { const r = await fetch(`/api/vehicles/${params.id}`); if (r.ok) setVehicle(await r.json()) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }, [params?.id])

  useEffect(() => {
    fetchVehicle()
    fetch('/api/hr').then(r => r.json()).then(data => setEmployees(data.filter((e: any) => e.status === 'פעיל'))).catch(() => {})
  }, [fetchVehicle])

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('he-IL') : '-'
  const formatCurrency = (n: number | null | undefined) => n != null ? `₪${n.toLocaleString()}` : '-'
  const today = new Date().toISOString().split('T')[0]

  const submitForm = async (endpoint: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true); setError(null)
    const fd = new FormData(e.currentTarget)
    const data: Record<string, any> = {}
    fd.forEach((v, k) => { data[k] = v === 'on' ? true : v })
    try {
      const res = await fetch(`/api/vehicles/${params?.id}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { setModal(null); fetchVehicle() } else { setError((await res.json()).error || 'שגיאה') }
    } catch { setError('שגיאה') } finally { setSaving(false) }
  }

  const handleUnassign = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/vehicles/${params?.id}/assign`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      if (res.ok) { setModal(null); fetchVehicle() }
    } catch {} finally { setSaving(false) }
  }

  if (loading) return <div className="p-8 text-center">טוען...</div>
  if (!vehicle) return <div className="p-8 text-center">רכב לא נמצא</div>

  const tabs = [
    { id: 'details', label: 'פרטים', icon: Car },
    { id: 'assignments', label: `היסטוריה (${vehicle.assignments?.length || 0})`, icon: User },
    { id: 'services', label: `טיפולים (${vehicle.services?.length || 0})`, icon: Wrench },
    { id: 'accidents', label: `תאונות (${vehicle.accidents?.length || 0})`, icon: AlertTriangle },
    { id: 'fuel', label: `דלק (${vehicle.fuelLogs?.length || 0})`, icon: Fuel },
    { id: 'tolls', label: `אגרה (${vehicle.tollRoads?.length || 0})`, icon: Route },
    { id: 'parking', label: `חניות (${vehicle.parkings?.length || 0})`, icon: MapPin },
    { id: 'tickets', label: `דוחות (${vehicle.tickets?.length || 0})`, icon: FileWarning },
  ]

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
        {[
          { label: 'ק"מ', value: vehicle.currentKm?.toLocaleString() || '-' },
          { label: 'צריכה', value: vehicle.stats?.avgFuelConsumption > 0 ? vehicle.stats.avgFuelConsumption : '-' },
          { label: 'דלק', value: formatCurrency(vehicle.stats?.totalFuelCost) },
          { label: 'טיפולים', value: formatCurrency(vehicle.stats?.totalServiceCost) },
          { label: 'תאונות', value: formatCurrency(vehicle.stats?.totalAccidentCost) },
          { label: 'אגרה', value: formatCurrency(vehicle.stats?.totalTollCost) },
          { label: 'חניות', value: formatCurrency(vehicle.stats?.totalParkingCost) },
          { label: 'דוחות', value: formatCurrency(vehicle.stats?.totalTicketsCost), alert: vehicle.stats?.pendingTickets > 0 },
        ].map((s, i) => <div key={i} className="bg-white rounded-lg p-3 border"><div className="text-gray-500 text-xs">{s.label}</div><div className={`font-bold ${s.alert ? 'text-red-600' : ''}`}>{s.value}</div></div>)}
      </div>

      {/* Tabs */}
      <div className="border-b mb-6 flex gap-1 overflow-x-auto">
        {tabs.map(t => <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-3 py-2 border-b-2 whitespace-nowrap flex items-center gap-1 text-sm ${activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><t.icon size={14} />{t.label}</button>)}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border p-6">
        {activeTab === 'details' && (
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-3">פרטי רכב</h3>
              <dl className="space-y-2 text-sm">
                {[['מספר רישוי', vehicle.licensePlate], ['יצרן', vehicle.manufacturer], ['דגם', vehicle.model], ['שנה', vehicle.year], ['צבע', vehicle.color], ['ק"מ', vehicle.currentKm?.toLocaleString()]].map(([l, v]) => <div key={l} className="flex justify-between"><dt className="text-gray-500">{l}</dt><dd>{v || '-'}</dd></div>)}
              </dl>
              <h3 className="font-semibold mt-6 mb-3">תחזוקה</h3>
              <dl className="space-y-2 text-sm">
                {[['טיפול אחרון', formatDate(vehicle.lastServiceDate)], ['טיפול הבא', formatDate(vehicle.nextServiceDate)]].map(([l, v]) => <div key={l} className="flex justify-between"><dt className="text-gray-500">{l}</dt><dd>{v}</dd></div>)}
              </dl>
            </div>
            <div>
              <h3 className="font-semibold mb-3">חוזה</h3>
              <dl className="space-y-2 text-sm">
                {[['סוג', vehicle.contractType ? contractLabels[vehicle.contractType] : '-'], ['חברה', vehicle.leasingCompany], ['תחילה', formatDate(vehicle.contractStartDate)], ['סיום', formatDate(vehicle.contractEndDate)], ['עלות חודשית', formatCurrency(vehicle.monthlyPayment)]].map(([l, v]) => <div key={l} className="flex justify-between"><dt className="text-gray-500">{l}</dt><dd>{v || '-'}</dd></div>)}
              </dl>
              <h3 className="font-semibold mt-6 mb-3">נהג נוכחי</h3>
              {vehicle.currentDriver ? (
                <div className="flex justify-between"><Link href={`/dashboard/hr/${vehicle.currentDriver.id}`} className="text-blue-600">{vehicle.currentDriver.firstName} {vehicle.currentDriver.lastName}</Link><button onClick={() => setModal('unassign')} className="text-red-600 text-sm">בטל שיוך</button></div>
              ) : (
                <div className="flex justify-between"><span className="text-gray-400">לא משויך</span><button onClick={() => setModal('assign')} className="text-blue-600 text-sm">שייך לעובד</button></div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div>
            <div className="flex justify-between mb-4"><h3 className="font-semibold">היסטוריית שיוך</h3>{!vehicle.currentDriver && <button onClick={() => setModal('assign')} className="text-blue-600 text-sm flex items-center gap-1"><Plus size={14} />שייך</button>}</div>
            {!vehicle.assignments?.length ? <p className="text-gray-500 text-center py-8">אין היסטוריה</p> : (
              <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-right p-2">עובד</th><th className="text-right p-2">מתאריך</th><th className="text-right p-2">עד</th><th className="text-right p-2">ק"מ התחלה</th><th className="text-right p-2">ק"מ סיום</th></tr></thead>
                <tbody>{vehicle.assignments.map((a: any) => <tr key={a.id} className="border-t"><td className="p-2"><Link href={`/dashboard/hr/${a.employee.id}`} className="text-blue-600">{a.employee.firstName} {a.employee.lastName}</Link></td><td className="p-2">{formatDate(a.startDate)}</td><td className="p-2">{a.endDate ? formatDate(a.endDate) : <span className="text-green-600">נוכחי</span>}</td><td className="p-2">{a.startKm?.toLocaleString() || '-'}</td><td className="p-2">{a.endKm?.toLocaleString() || '-'}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'services' && (
          <div>
            <div className="flex justify-between mb-4"><h3 className="font-semibold">טיפולים</h3><button onClick={() => setModal('service')} className="text-blue-600 text-sm flex items-center gap-1"><Plus size={14} />הוסף</button></div>
            {!vehicle.services?.length ? <p className="text-gray-500 text-center py-8">אין טיפולים</p> : (
              <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-right p-2">תאריך</th><th className="text-right p-2">סוג</th><th className="text-right p-2">ק"מ</th><th className="text-right p-2">עלות</th><th className="text-right p-2">מוסך</th></tr></thead>
                <tbody>{vehicle.services.map((s: any) => <tr key={s.id} className="border-t"><td className="p-2">{formatDate(s.serviceDate)}</td><td className="p-2">{s.serviceType}</td><td className="p-2">{s.mileage?.toLocaleString() || '-'}</td><td className="p-2">{formatCurrency(s.cost)}</td><td className="p-2">{s.garage || '-'}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'accidents' && (
          <div>
            <div className="flex justify-between mb-4"><h3 className="font-semibold">תאונות</h3><button onClick={() => setModal('accident')} className="text-blue-600 text-sm flex items-center gap-1"><Plus size={14} />הוסף</button></div>
            {!vehicle.accidents?.length ? <p className="text-gray-500 text-center py-8">אין תאונות</p> : (
              <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-right p-2">תאריך</th><th className="text-right p-2">עובד</th><th className="text-right p-2">מיקום</th><th className="text-right p-2">עלות</th><th className="text-right p-2">סטטוס</th></tr></thead>
                <tbody>{vehicle.accidents.map((a: any) => <tr key={a.id} className="border-t"><td className="p-2">{formatDate(a.date)}</td><td className="p-2">{a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : '-'}</td><td className="p-2">{a.location || '-'}</td><td className="p-2">{formatCurrency(a.cost)}</td><td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${accidentStatusColors[a.status]}`}>{a.status === 'OPEN' ? 'פתוח' : a.status === 'CLOSED' ? 'סגור' : 'בטיפול'}</span></td></tr>)}</tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'fuel' && (
          <div>
            <div className="flex justify-between mb-4"><h3 className="font-semibold">תדלוקים</h3><button onClick={() => setModal('fuel')} className="text-blue-600 text-sm flex items-center gap-1"><Plus size={14} />הוסף</button></div>
            {!vehicle.fuelLogs?.length ? <p className="text-gray-500 text-center py-8">אין תדלוקים</p> : (
              <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-right p-2">תאריך</th><th className="text-right p-2">עובד</th><th className="text-right p-2">ליטרים</th><th className="text-right p-2">עלות</th><th className="text-right p-2">ק"מ</th></tr></thead>
                <tbody>{vehicle.fuelLogs.map((f: any) => <tr key={f.id} className="border-t"><td className="p-2">{formatDate(f.date)}</td><td className="p-2">{f.employee ? `${f.employee.firstName} ${f.employee.lastName}` : '-'}</td><td className="p-2">{f.liters.toFixed(1)}</td><td className="p-2">{formatCurrency(f.totalCost)}</td><td className="p-2">{f.mileage?.toLocaleString() || '-'}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'tolls' && (
          <div>
            <div className="flex justify-between mb-4"><h3 className="font-semibold">כבישי אגרה</h3><button onClick={() => setModal('toll')} className="text-blue-600 text-sm flex items-center gap-1"><Plus size={14} />הוסף</button></div>
            {!vehicle.tollRoads?.length ? <p className="text-gray-500 text-center py-8">אין נסיעות</p> : (
              <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-right p-2">תאריך</th><th className="text-right p-2">עובד</th><th className="text-right p-2">כביש</th><th className="text-right p-2">כניסה</th><th className="text-right p-2">יציאה</th><th className="text-right p-2">עלות</th></tr></thead>
                <tbody>{vehicle.tollRoads.map((t: any) => <tr key={t.id} className="border-t"><td className="p-2">{formatDate(t.date)}</td><td className="p-2">{t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : '-'}</td><td className="p-2">{t.road}</td><td className="p-2">{t.entryPoint || '-'}</td><td className="p-2">{t.exitPoint || '-'}</td><td className="p-2">{formatCurrency(t.cost)}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'parking' && (
          <div>
            <div className="flex justify-between mb-4"><h3 className="font-semibold">חניות</h3><button onClick={() => setModal('parking')} className="text-blue-600 text-sm flex items-center gap-1"><Plus size={14} />הוסף</button></div>
            {!vehicle.parkings?.length ? <p className="text-gray-500 text-center py-8">אין חניות</p> : (
              <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-right p-2">תאריך</th><th className="text-right p-2">עובד</th><th className="text-right p-2">מיקום</th><th className="text-right p-2">חניון</th><th className="text-right p-2">עלות</th></tr></thead>
                <tbody>{vehicle.parkings.map((p: any) => <tr key={p.id} className="border-t"><td className="p-2">{formatDate(p.date)}</td><td className="p-2">{p.employee ? `${p.employee.firstName} ${p.employee.lastName}` : '-'}</td><td className="p-2">{p.location}</td><td className="p-2">{p.parkingLot || '-'}</td><td className="p-2">{formatCurrency(p.cost)}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'tickets' && (
          <div>
            <div className="flex justify-between mb-4"><h3 className="font-semibold">דוחות</h3><button onClick={() => setModal('ticket')} className="text-blue-600 text-sm flex items-center gap-1"><Plus size={14} />הוסף</button></div>
            {!vehicle.tickets?.length ? <p className="text-gray-500 text-center py-8">אין דוחות</p> : (
              <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-right p-2">תאריך</th><th className="text-right p-2">עובד</th><th className="text-right p-2">סוג</th><th className="text-right p-2">מיקום</th><th className="text-right p-2">קנס</th><th className="text-right p-2">נקודות</th><th className="text-right p-2">סטטוס</th></tr></thead>
                <tbody>{vehicle.tickets.map((t: any) => <tr key={t.id} className="border-t"><td className="p-2">{formatDate(t.date)}</td><td className="p-2">{t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : '-'}</td><td className="p-2">{t.ticketType}</td><td className="p-2">{t.location || '-'}</td><td className="p-2">{formatCurrency(t.fineAmount)}</td><td className="p-2">{t.points || '-'}</td><td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${ticketStatusColors[t.status]}`}>{ticketStatusLabels[t.status]}</span></td></tr>)}</tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}
      {modal === 'assign' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">שיוך לעובד</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={e => submitForm('assign', e)} className="space-y-4">
            <div><label className="block text-sm mb-1">עובד *</label><select name="employeeId" required className="w-full border rounded p-2"><option value="">בחר</option>{employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select></div>
            <div><label className="block text-sm mb-1">ק"מ</label><input type="number" name="currentKm" defaultValue={vehicle.currentKm || ''} className="w-full border rounded p-2" /></div>
            <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'שומר...' : 'שייך'}</button></div>
          </form>
        </div></div>
      )}

      {modal === 'unassign' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <h3 className="font-semibold mb-4">ביטול שיוך</h3>
          <p className="mb-4">לבטל שיוך מ-{vehicle.currentDriver?.firstName} {vehicle.currentDriver?.lastName}?</p>
          <div className="flex gap-3 justify-end"><button onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button onClick={handleUnassign} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50">{saving ? 'מבטל...' : 'בטל'}</button></div>
        </div></div>
      )}

      {modal === 'service' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">הוספת טיפול</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={e => submitForm('services', e)} className="space-y-4">
            <div><label className="block text-sm mb-1">תאריך *</label><input type="date" name="serviceDate" required defaultValue={today} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">סוג *</label><select name="serviceType" required className="w-full border rounded p-2"><option value="">בחר</option>{serviceTypes.map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">ק"מ</label><input type="number" name="mileage" defaultValue={vehicle.currentKm || ''} className="w-full border rounded p-2" /></div><div><label className="block text-sm mb-1">עלות ₪</label><input type="number" name="cost" className="w-full border rounded p-2" /></div></div>
            <div><label className="block text-sm mb-1">מוסך</label><input name="garage" className="w-full border rounded p-2" /></div>
            <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'שומר...' : 'הוסף'}</button></div>
          </form>
        </div></div>
      )}

      {modal === 'accident' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">הוספת תאונה</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={e => submitForm('accidents', e)} className="space-y-4">
            <div><label className="block text-sm mb-1">תאריך *</label><input type="date" name="date" required defaultValue={today} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">מיקום</label><input name="location" className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">תיאור</label><textarea name="description" rows={2} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">עלות ₪</label><input type="number" name="cost" className="w-full border rounded p-2" /></div>
            <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'שומר...' : 'הוסף'}</button></div>
          </form>
        </div></div>
      )}

      {modal === 'fuel' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">הוספת תדלוק</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={e => submitForm('fuel', e)} className="space-y-4">
            <div><label className="block text-sm mb-1">תאריך *</label><input type="date" name="date" required defaultValue={today} className="w-full border rounded p-2" /></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">ליטרים *</label><input type="number" step="0.1" name="liters" required className="w-full border rounded p-2" /></div><div><label className="block text-sm mb-1">עלות ₪ *</label><input type="number" name="totalCost" required className="w-full border rounded p-2" /></div></div>
            <div><label className="block text-sm mb-1">ק"מ</label><input type="number" name="mileage" defaultValue={vehicle.currentKm || ''} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">תחנה</label><input name="station" className="w-full border rounded p-2" /></div>
            <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'שומר...' : 'הוסף'}</button></div>
          </form>
        </div></div>
      )}

      {modal === 'toll' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">הוספת כביש אגרה</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={e => submitForm('tolls', e)} className="space-y-4">
            <div><label className="block text-sm mb-1">תאריך *</label><input type="date" name="date" required defaultValue={today} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">כביש *</label><select name="road" required className="w-full border rounded p-2"><option value="">בחר</option>{tollRoadsList.map(r => <option key={r}>{r}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">כניסה</label><input name="entryPoint" className="w-full border rounded p-2" /></div><div><label className="block text-sm mb-1">יציאה</label><input name="exitPoint" className="w-full border rounded p-2" /></div></div>
            <div><label className="block text-sm mb-1">עלות ₪ *</label><input type="number" step="0.01" name="cost" required className="w-full border rounded p-2" /></div>
            <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'שומר...' : 'הוסף'}</button></div>
          </form>
        </div></div>
      )}

      {modal === 'parking' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">הוספת חניה</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={e => submitForm('parking', e)} className="space-y-4">
            <div><label className="block text-sm mb-1">תאריך *</label><input type="date" name="date" required defaultValue={today} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">מיקום *</label><input name="location" required className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">חניון</label><input name="parkingLot" className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">עלות ₪ *</label><input type="number" step="0.01" name="cost" required className="w-full border rounded p-2" /></div>
            <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded">ביטול</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'שומר...' : 'הוסף'}</button></div>
          </form>
        </div></div>
      )}

      {modal === 'ticket' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between mb-4"><h3 className="font-semibold">הוספת דוח</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={e => submitForm('tickets', e)} className="space-y-4">
            <div><label className="block text-sm mb-1">תאריך עבירה *</label><input type="date" name="date" required defaultValue={today} className="w-full border rounded p-2" /></div>
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

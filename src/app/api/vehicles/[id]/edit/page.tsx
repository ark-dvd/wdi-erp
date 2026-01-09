// ============================================
// src/app/dashboard/vehicles/[id]/edit/page.tsx
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Save, Car } from 'lucide-react'

export default function EditVehiclePage() {
  const params = useParams()
  const router = useRouter()
  const [vehicle, setVehicle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!params?.id) return
    fetch(`/api/vehicles/${params.id}`).then(r => r.json()).then(setVehicle).finally(() => setLoading(false))
  }, [params?.id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true); setError(null)
    const fd = new FormData(e.currentTarget)
    const data: Record<string, any> = {}
    fd.forEach((v, k) => { data[k] = v || null })
    try {
      const res = await fetch(`/api/vehicles/${params?.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) router.push(`/dashboard/vehicles/${params?.id}`)
      else setError((await res.json()).error || 'שגיאה')
    } catch { setError('שגיאה') } finally { setSaving(false) }
  }

  const fmtDate = (d: string | null) => d ? new Date(d).toISOString().split('T')[0] : ''

  if (loading) return <div className="p-8 text-center">טוען...</div>
  if (!vehicle) return <div className="p-8 text-center">רכב לא נמצא</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href={`/dashboard/vehicles/${vehicle.id}`} className="text-blue-600 text-sm flex items-center gap-1 mb-4"><ArrowRight size={14} /> חזרה</Link>
      <div className="flex items-center gap-4 mb-6"><div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center"><Car className="text-blue-600" size={24} /></div><div><h1 className="text-2xl font-bold">עריכת רכב</h1><p className="text-gray-500">{vehicle.licensePlate}</p></div></div>
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">פרטי רכב</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div><label className="block text-sm mb-1">מספר רישוי *</label><input name="licensePlate" required defaultValue={vehicle.licensePlate} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">יצרן *</label><input name="manufacturer" required defaultValue={vehicle.manufacturer} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">דגם *</label><input name="model" required defaultValue={vehicle.model} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">שנה</label><input type="number" name="year" defaultValue={vehicle.year || ''} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">צבע</label><input name="color" defaultValue={vehicle.color || ''} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">סטטוס</label><select name="status" defaultValue={vehicle.status} className="w-full border rounded p-2"><option value="ACTIVE">פעיל</option><option value="IN_SERVICE">בטיפול</option><option value="RETURNED">הוחזר</option><option value="SOLD">נמכר</option></select></div>
            <div><label className="block text-sm mb-1">ק"מ נוכחי</label><input type="number" name="currentKm" defaultValue={vehicle.currentKm || ''} className="w-full border rounded p-2" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">חוזה</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div><label className="block text-sm mb-1">סוג</label><select name="contractType" defaultValue={vehicle.contractType || ''} className="w-full border rounded p-2"><option value="">-</option><option value="LEASING">ליסינג</option><option value="RENTAL">השכרה</option></select></div>
            <div><label className="block text-sm mb-1">חברה</label><input name="leasingCompany" defaultValue={vehicle.leasingCompany || ''} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">עלות חודשית</label><input type="number" name="monthlyPayment" defaultValue={vehicle.monthlyPayment || ''} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">תחילה</label><input type="date" name="contractStartDate" defaultValue={fmtDate(vehicle.contractStartDate)} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">סיום</label><input type="date" name="contractEndDate" defaultValue={fmtDate(vehicle.contractEndDate)} className="w-full border rounded p-2" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">תחזוקה</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="block text-sm mb-1">טיפול הבא - תאריך</label><input type="date" name="nextServiceDate" defaultValue={fmtDate(vehicle.nextServiceDate)} className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">טיפול הבא - ק"מ</label><input type="number" name="nextServiceKm" defaultValue={vehicle.nextServiceKm || ''} className="w-full border rounded p-2" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">הערות</h2>
          <textarea name="notes" rows={3} defaultValue={vehicle.notes || ''} className="w-full border rounded p-2" />
        </div>
        <div className="flex gap-4 justify-end">
          <Link href={`/dashboard/vehicles/${vehicle.id}`} className="px-6 py-2 border rounded-lg">ביטול</Link>
          <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"><Save size={16} />{saving ? 'שומר...' : 'שמור'}</button>
        </div>
      </form>
    </div>
  )
}

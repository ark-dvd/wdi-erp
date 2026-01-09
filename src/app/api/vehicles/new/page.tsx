// ============================================
// src/app/dashboard/vehicles/new/page.tsx
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Save, Car } from 'lucide-react'

export default function NewVehiclePage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/hr').then(r => r.json()).then(data => setEmployees(data.filter((e: any) => e.status === 'פעיל'))).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true); setError(null)
    const fd = new FormData(e.currentTarget)
    const data: Record<string, any> = {}
    fd.forEach((v, k) => { data[k] = v || null })
    try {
      const res = await fetch('/api/vehicles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { const v = await res.json(); router.push(`/dashboard/vehicles/${v.id}`) }
      else setError((await res.json()).error || 'שגיאה')
    } catch { setError('שגיאה') } finally { setSaving(false) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/dashboard/vehicles" className="text-blue-600 text-sm flex items-center gap-1 mb-4"><ArrowRight size={14} /> חזרה</Link>
      <div className="flex items-center gap-4 mb-6"><div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center"><Car className="text-blue-600" size={24} /></div><div><h1 className="text-2xl font-bold">רכב חדש</h1><p className="text-gray-500">הזן פרטים</p></div></div>
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">פרטי רכב</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div><label className="block text-sm mb-1">מספר רישוי *</label><input name="licensePlate" required placeholder="12-345-67" className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">יצרן *</label><input name="manufacturer" required placeholder="סקודה" className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">דגם *</label><input name="model" required placeholder="קודיאק" className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">שנה</label><input type="number" name="year" placeholder="2024" className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">צבע</label><input name="color" placeholder="לבן" className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">ק"מ נוכחי</label><input type="number" name="currentKm" placeholder="0" className="w-full border rounded p-2" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">חוזה</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div><label className="block text-sm mb-1">סוג</label><select name="contractType" className="w-full border rounded p-2"><option value="">-</option><option value="LEASING">ליסינג</option><option value="RENTAL">השכרה</option></select></div>
            <div><label className="block text-sm mb-1">חברה</label><input name="leasingCompany" placeholder="הרדן, אביס..." className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">עלות חודשית</label><input type="number" name="monthlyPayment" placeholder="4500" className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">תחילה</label><input type="date" name="contractStartDate" className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">סיום</label><input type="date" name="contractEndDate" className="w-full border rounded p-2" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">שיוך לעובד</h2>
          <select name="currentDriverId" className="w-full border rounded p-2 max-w-md"><option value="">ללא שיוך</option>{employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">תחזוקה</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="block text-sm mb-1">טיפול הבא - תאריך</label><input type="date" name="nextServiceDate" className="w-full border rounded p-2" /></div>
            <div><label className="block text-sm mb-1">טיפול הבא - ק"מ</label><input type="number" name="nextServiceKm" placeholder="20000" className="w-full border rounded p-2" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">הערות</h2>
          <textarea name="notes" rows={3} className="w-full border rounded p-2" placeholder="הערות..." />
        </div>
        <div className="flex gap-4 justify-end">
          <Link href="/dashboard/vehicles" className="px-6 py-2 border rounded-lg">ביטול</Link>
          <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"><Save size={16} />{saving ? 'שומר...' : 'צור רכב'}</button>
        </div>
      </form>
    </div>
  )
}

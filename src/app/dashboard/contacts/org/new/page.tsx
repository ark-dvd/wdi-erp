'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Save, Loader2, X } from 'lucide-react'
import { ORG_TYPES, CONTACT_TYPES, DISCIPLINES } from '@/lib/contact-constants'


export default function NewOrganizationPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: '', type: '', phone: '', email: '', website: '',
    address: '', businessId: '', logoUrl: '', notes: '', isVendor: false,
    contactTypes: [] as string[], disciplines: [] as string[],
  })

  const toggleContactType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      contactTypes: prev.contactTypes.includes(type)
        ? prev.contactTypes.filter(t => t !== type)
        : [...prev.contactTypes, type]
    }))
  }

  const toggleDiscipline = (discipline: string) => {
    setFormData(prev => ({
      ...prev,
      disciplines: prev.disciplines.includes(discipline)
        ? prev.disciplines.filter(d => d !== discipline)
        : [...prev.disciplines, discipline]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // וולידציה - שדות חובה
    if (formData.contactTypes.length === 0) {
      setError('יש לבחור לפחות סוג ארגון אחד')
      return
    }
    if (formData.disciplines.length === 0) {
      setError('יש לבחור לפחות דיסציפלינה אחת')
      return
    }
    
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Failed to create organization')
      const org = await res.json()
      router.push(`/dashboard/contacts/org/${org.id}`)
    } catch (err) {
      setError('שגיאה ביצירת הארגון')
      console.error(err)
    } finally { setSaving(false) }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-6 pb-0">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/contacts?tab=organizations" className="p-2 hover:bg-[#f5f6f8] rounded-lg transition-colors"><ArrowRight size={20} className="text-[#3a3a3d]" /></Link>
          <h1 className="text-2xl font-bold text-[#0a3161]">ארגון חדש</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
          {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">{error}</div>}

          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="text-lg font-semibold text-[#0a3161] mb-4">פרטי הארגון</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">שם הארגון <span className="text-red-500">*</span></label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">סוג ארגון</label><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg"><option value="">בחר סוג</option>{ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">ח.פ / מספר עוסק</label><input type="text" value={formData.businessId} onChange={(e) => setFormData({ ...formData, businessId: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">אתר אינטרנט</label><input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg" /></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="text-lg font-semibold text-[#0a3161] mb-4">סיווג</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3a3a3d] mb-2">סוג קשר <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {CONTACT_TYPES.map(type => (
                    <button key={type} type="button" onClick={() => toggleContactType(type)} className={`px-4 py-2 rounded-lg border transition-colors ${formData.contactTypes.includes(type) ? 'bg-[#0a3161] text-white border-[#0a3161]' : 'bg-white text-[#3a3a3d] border-[#e2e4e8] hover:border-[#0a3161]'}`}>{type}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3a3a3d] mb-2">דיסציפלינות <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {DISCIPLINES.map(disc => (
                    <button key={disc} type="button" onClick={() => toggleDiscipline(disc)} className={`px-4 py-2 rounded-lg border transition-colors ${formData.disciplines.includes(disc) ? 'bg-[#0a3161] text-white border-[#0a3161]' : 'bg-white text-[#3a3a3d] border-[#e2e4e8] hover:border-[#0a3161]'}`}>{disc}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="text-lg font-semibold text-[#0a3161] mb-4">פרטי קשר</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">טלפון</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">אימייל</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg" /></div>
              <div className="col-span-2"><label className="block text-sm font-medium text-[#3a3a3d] mb-1">כתובת</label><input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg" /></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="text-lg font-semibold text-[#0a3161] mb-4">הערות</h2>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={4} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg resize-none" />
          </div>

          <div className="flex justify-end gap-3 sticky bottom-0 bg-[#f5f6f8] py-4 -mx-6 px-6">
            <Link href="/dashboard/contacts?tab=organizations" className="px-6 py-2 border border-[#e2e4e8] rounded-lg hover:bg-white transition-colors">ביטול</Link>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-[#0a3161] text-white rounded-lg hover:bg-[#0a3161]/90 transition-colors disabled:opacity-50">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}{saving ? 'שומר...' : 'שמור'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
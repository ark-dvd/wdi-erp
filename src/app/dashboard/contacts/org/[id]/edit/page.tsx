// ============================================
// src/app/dashboard/contacts/org/[id]/edit/page.tsx
// Version: 20260126-V3-CATEGORIES
// V3-CATEGORIES: Multi-select contact types with dynamic categories
// ============================================

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Save, Loader2 } from 'lucide-react'
import { ORG_TYPES, CONTACT_TYPES, getCategoriesForTypes, hasOtherType, isOnlyOtherType } from '@/lib/contact-constants'

export default function EditOrganizationPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params?.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '', type: '', phone: '', email: '', website: '',
    address: '', businessId: '', logoUrl: '', notes: '', isVendor: false,
    contactTypes: [] as string[],
    categories: [] as string[],  // UI uses categories, maps to disciplines in DB
    otherText: '',  // for "אחר" free text
  })

  // Compute available categories based on selected contact types
  const availableCategories = useMemo(() => {
    return getCategoriesForTypes(formData.contactTypes)
  }, [formData.contactTypes])

  // When contact types change, filter out categories that are no longer available
  useEffect(() => {
    if (formData.categories.length > 0) {
      const filteredCategories = formData.categories.filter(c => availableCategories.includes(c))
      if (filteredCategories.length !== formData.categories.length) {
        setFormData(prev => ({ ...prev, categories: filteredCategories }))
      }
    }
  }, [availableCategories])

  useEffect(() => { fetchOrg() }, [orgId])

  const fetchOrg = async () => {
    try {
      const res = await fetch(`/api/organizations/${orgId}`)
      if (res.ok) {
        const org = await res.json()
        setFormData({
          name: org.name || '',
          type: org.type || '',
          phone: org.phone || '',
          email: org.email || '',
          website: org.website || '',
          address: org.address || '',
          businessId: org.businessId || '',
          logoUrl: org.logoUrl || '',
          notes: org.notes || '',
          isVendor: org.isVendor || false,
          contactTypes: org.contactTypes || [],
          categories: org.disciplines || [],  // Map disciplines to categories
          otherText: org.otherText || '',
        })
      } else {
        setError('הארגון לא נמצא')
        setTimeout(() => router.push('/dashboard/contacts?tab=organizations'), 2000)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('שגיאה בטעינת הארגון')
    } finally { setLoading(false) }
  }

  const toggleContactType = (type: string) => {
    if (error) setError('')
    setFormData(prev => ({
      ...prev,
      contactTypes: prev.contactTypes.includes(type)
        ? prev.contactTypes.filter(t => t !== type)
        : [...prev.contactTypes, type]
    }))
  }

  const toggleCategory = (category: string) => {
    if (error) setError('')
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // וולידציה - שדות חובה
    if (formData.contactTypes.length === 0) {
      setError('יש לבחור לפחות סוג קשר אחד')
      return
    }

    // If only "אחר" is selected, otherText is required instead of categories
    if (isOnlyOtherType(formData.contactTypes)) {
      if (!formData.otherText.trim()) {
        setError('יש להזין תיאור עבור סוג "אחר"')
        return
      }
    } else if (formData.categories.length === 0) {
      setError('יש לבחור לפחות קטגוריה אחת')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Prepare data for API - map categories to disciplines field for DB compatibility
      const updateData = {
        ...formData,
        disciplines: formData.categories,  // DB field is still called disciplines
      }

      const res = await fetch(`/api/organizations/${orgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      if (!res.ok) throw new Error('Failed to update')
      router.push(`/dashboard/contacts/org/${orgId}`)
    } catch (err) {
      setError('שגיאה בעדכון הארגון')
      console.error(err)
    } finally { setSaving(false) }
  }

  const showCategoriesSection = formData.contactTypes.length > 0 && !isOnlyOtherType(formData.contactTypes)
  const showOtherTextField = hasOtherType(formData.contactTypes)

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-[#0a3161]" /></div>

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-6 pb-0">
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/dashboard/contacts/org/${orgId}`} className="p-2 hover:bg-[#f5f6f8] rounded-lg transition-colors"><ArrowRight size={20} className="text-[#3a3a3d]" /></Link>
          <div><h1 className="text-2xl font-bold text-[#0a3161]">עריכת ארגון</h1><p className="text-sm text-[#8f8f96]">{formData.name}</p></div>
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
                <p className="text-xs text-[#8f8f96] mb-2">ניתן לבחור יותר מסוג אחד</p>
                <div className="flex flex-wrap gap-2">
                  {CONTACT_TYPES.map(type => (
                    <button key={type} type="button" onClick={() => toggleContactType(type)} className={`px-4 py-2 rounded-lg border transition-colors ${formData.contactTypes.includes(type) ? 'bg-[#0a3161] text-white border-[#0a3161]' : 'bg-white text-[#3a3a3d] border-[#e2e4e8] hover:border-[#0a3161]'}`}>{type}</button>
                  ))}
                </div>
              </div>

              {/* Categories section - shows only when contact types selected (except only "אחר") */}
              {showCategoriesSection && (
                <div>
                  <label className="block text-sm font-medium text-[#3a3a3d] mb-2">קטגוריות <span className="text-red-500">*</span></label>
                  <p className="text-xs text-[#8f8f96] mb-2">
                    מציג קטגוריות עבור: {formData.contactTypes.filter(t => t !== 'אחר').join(', ')}
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto p-1">
                    {availableCategories.map(category => (
                      <button key={category} type="button" onClick={() => toggleCategory(category)} className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${formData.categories.includes(category) ? 'bg-[#0a3161] text-white border-[#0a3161]' : 'bg-white text-[#3a3a3d] border-[#e2e4e8] hover:border-[#0a3161]'}`}>{category}</button>
                    ))}
                  </div>
                  {formData.categories.length > 0 && (
                    <p className="text-xs text-[#8f8f96] mt-2">נבחרו: {formData.categories.length} קטגוריות</p>
                  )}
                </div>
              )}

              {/* Free text for "אחר" */}
              {showOtherTextField && (
                <div>
                  <label className="block text-sm font-medium text-[#3a3a3d] mb-1">
                    תיאור סוג "אחר" {isOnlyOtherType(formData.contactTypes) && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.otherText}
                    onChange={(e) => setFormData({ ...formData, otherText: e.target.value })}
                    placeholder="הזן תיאור..."
                    className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                  />
                </div>
              )}
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
            <Link href={`/dashboard/contacts/org/${orgId}`} className="px-6 py-2 border border-[#e2e4e8] rounded-lg hover:bg-white transition-colors">ביטול</Link>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-[#0a3161] text-white rounded-lg hover:bg-[#0a3161]/90 transition-colors disabled:opacity-50">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}{saving ? 'שומר...' : 'שמור שינויים'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

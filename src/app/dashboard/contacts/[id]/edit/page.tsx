// ============================================
// src/app/dashboard/contacts/[id]/edit/page.tsx
// Version: 20260126-V3-CATEGORIES
// UI-015: Added dirty state warning
// UI-025, UI-016, UI-017, UI-024: Added success toast
// UI-013: Added error clearing on form change
// V3-CATEGORIES: Multi-select contact types with dynamic categories
// ============================================

'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Save, Trash2, Loader2, Info } from 'lucide-react'
import { CONTACT_TYPES, getCategoriesForTypes, hasOtherType, isOnlyOtherType } from '@/lib/contact-constants'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { useToast } from '@/components/Toast'

interface Organization {
  id: string
  name: string
  type: string | null
  contactTypes?: string[]
  disciplines?: string[]
}

export default function EditContactPage() {
  const params = useParams()
  const router = useRouter()
  const { showSuccess, showError } = useToast()
  const contactId = params?.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [inheritedFromOrg, setInheritedFromOrg] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', nickname: '', phone: '', phoneAlt: '',
    email: '', emailAlt: '', linkedinUrl: '', organizationId: '',
    role: '', department: '',
    contactTypes: [] as string[],
    categories: [] as string[],  // UI uses categories, maps to disciplines in DB
    otherText: '',  // for "אחר" free text
    status: 'פעיל', notes: '',
  })

  // UI-015: Track original data for dirty state detection
  const originalDataRef = useRef<string>('')
  const isDirty = originalDataRef.current !== '' && originalDataRef.current !== JSON.stringify(formData)

  // UI-015: Warn before navigating away from unsaved changes
  useUnsavedChangesWarning(isDirty)

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

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchOrganizations(), fetchContact()])
    }
    loadData()
  }, [contactId])

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations')
      if (res.ok) {
        const data = await res.json()
        // Handle paginated response (API returns { items: [...], pagination: {...} })
        setOrganizations(data.items || data)
      }
    } catch (error) { console.error('Error fetching organizations:', error) }
  }

  const fetchContact = async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}`)
      if (res.ok) {
        const contact = await res.json()
        const data = {
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          nickname: contact.nickname || '',
          phone: contact.phone || '',
          phoneAlt: contact.phoneAlt || '',
          email: contact.email || '',
          emailAlt: contact.emailAlt || '',
          linkedinUrl: contact.linkedinUrl || '',
          organizationId: contact.organizationId || '',
          role: contact.role || '',
          department: contact.department || '',
          contactTypes: contact.contactTypes || [],
          categories: contact.disciplines || [],  // Map disciplines to categories
          otherText: contact.otherText || '',
          status: contact.status || 'פעיל',
          notes: contact.notes || '',
        }
        setFormData(data)
        // UI-015: Store original data for dirty detection
        originalDataRef.current = JSON.stringify(data)
      } else {
        setError('איש הקשר לא נמצא')
        setTimeout(() => router.push('/dashboard/contacts'), 2000)
      }
    } catch (error) {
      console.error('Error fetching contact:', error)
      setError('שגיאה בטעינת איש הקשר')
    } finally { setLoading(false) }
  }

  // Inherit from organization (optional user action)
  const handleInheritFromOrg = () => {
    if (formData.organizationId) {
      const selectedOrg = organizations.find(o => o.id === formData.organizationId)
      if (selectedOrg && (selectedOrg.contactTypes?.length || selectedOrg.disciplines?.length)) {
        setFormData(prev => ({
          ...prev,
          contactTypes: selectedOrg.contactTypes || prev.contactTypes,
          categories: selectedOrg.disciplines || prev.categories,
        }))
        setInheritedFromOrg(true)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // וולידציה - שדות חובה
    if (formData.contactTypes.length === 0) {
      setError('יש לבחור לפחות סוג איש קשר אחד')
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

      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      if (!res.ok) throw new Error('Failed to update contact')
      // UI-015: Clear dirty state before navigation
      originalDataRef.current = JSON.stringify(formData)
      // UI-025, UI-016, UI-017, UI-024: Show success confirmation
      showSuccess('איש הקשר עודכן בהצלחה')
      router.push(`/dashboard/contacts/${contactId}`)
    } catch (err) {
      setError('שגיאה בעדכון איש הקשר')
      showError('שגיאה בעדכון איש הקשר')
      console.error(err)
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' })
      if (res.ok) router.push('/dashboard/contacts')
      else throw new Error('Failed to delete')
    } catch (err) {
      setError('שגיאה במחיקת איש הקשר')
      setShowDeleteModal(false)
    } finally { setDeleting(false) }
  }

  const toggleContactType = (type: string) => {
    // UI-013: Clear error when field is corrected
    if (error) setError('')
    setInheritedFromOrg(false)
    setFormData(prev => ({
      ...prev,
      contactTypes: prev.contactTypes.includes(type)
        ? prev.contactTypes.filter(t => t !== type)
        : [...prev.contactTypes, type]
    }))
  }

  const toggleCategory = (category: string) => {
    // UI-013: Clear error when field is corrected
    if (error) setError('')
    setInheritedFromOrg(false)
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }))
  }

  // UI-013: Helper to clear error on any field change
  const handleFieldChange = (field: string, value: string) => {
    if (error) setError('')
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const showCategoriesSection = formData.contactTypes.length > 0 && !isOnlyOtherType(formData.contactTypes)
  const showOtherTextField = hasOtherType(formData.contactTypes)

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-[#0a3161]" /></div>

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-6 pb-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/contacts/${contactId}`} className="p-2 hover:bg-[#f5f6f8] rounded-lg transition-colors"><ArrowRight size={20} className="text-[#3a3a3d]" /></Link>
            <div><h1 className="text-2xl font-bold text-[#0a3161]">עריכת איש קשר</h1><p className="text-sm text-[#8f8f96]">{formData.lastName} {formData.firstName}</p></div>
          </div>
          <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={18} /><span>מחיקה</span></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
          {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">{error}</div>}

          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="text-lg font-semibold text-[#0a3161] mb-4">פרטים אישיים</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">שם פרטי <span className="text-red-500">*</span></label><input type="text" value={formData.firstName} onChange={(e) => handleFieldChange('firstName', e.target.value)} required className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">שם משפחה <span className="text-red-500">*</span></label><input type="text" value={formData.lastName} onChange={(e) => handleFieldChange('lastName', e.target.value)} required className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">טלפון נייד <span className="text-red-500">*</span></label><input type="tel" value={formData.phone} onChange={(e) => handleFieldChange('phone', e.target.value)} required className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">טלפון נוסף</label><input type="tel" value={formData.phoneAlt} onChange={(e) => handleFieldChange('phoneAlt', e.target.value)} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">אימייל</label><input type="email" value={formData.email} onChange={(e) => handleFieldChange('email', e.target.value)} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">אימייל נוסף</label><input type="email" value={formData.emailAlt} onChange={(e) => handleFieldChange('emailAlt', e.target.value)} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="text-lg font-semibold text-[#0a3161] mb-4">שיוך ארגוני</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">ארגון</label>
                <select value={formData.organizationId} onChange={(e) => handleFieldChange('organizationId', e.target.value)} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]">
                  <option value="">בחר ארגון</option>
                  {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">תפקיד בארגון</label><input type="text" value={formData.role} onChange={(e) => handleFieldChange('role', e.target.value)} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
            </div>
            {formData.organizationId && (
              <button
                type="button"
                onClick={handleInheritFromOrg}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Info size={14} />
                ירש סיווג מהארגון
              </button>
            )}
          </div>

          {/* סוגי איש קשר */}
          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="text-lg font-semibold text-[#0a3161] mb-4">סיווג</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-[#3a3a3d]">סוג איש קשר <span className="text-red-500">*</span></label>
                  {inheritedFromOrg && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                      <Info size={12} />
                      ירושה מהארגון
                    </span>
                  )}
                </div>
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
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-[#3a3a3d]">קטגוריות <span className="text-red-500">*</span></label>
                    {inheritedFromOrg && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                        <Info size={12} />
                        ירושה מהארגון
                      </span>
                    )}
                  </div>
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
                    onChange={(e) => handleFieldChange('otherText', e.target.value)}
                    placeholder="הזן תיאור..."
                    className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="text-lg font-semibold text-[#0a3161] mb-4">סטטוס והערות</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">סטטוס</label><select value={formData.status} onChange={(e) => handleFieldChange('status', e.target.value)} className="w-full max-w-xs px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"><option value="פעיל">פעיל</option><option value="לא פעיל">לא פעיל</option></select></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">הערות</label><textarea value={formData.notes} onChange={(e) => handleFieldChange('notes', e.target.value)} rows={4} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161] resize-none" /></div>
            </div>
          </div>

          <div className="flex justify-end gap-3 sticky bottom-0 bg-[#f5f6f8] py-4 -mx-6 px-6">
            <Link href={`/dashboard/contacts/${contactId}`} className="px-6 py-2 border border-[#e2e4e8] rounded-lg hover:bg-white transition-colors">ביטול</Link>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-[#0a3161] text-white rounded-lg hover:bg-[#0a3161]/90 transition-colors disabled:opacity-50">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}{saving ? 'שומר...' : 'שמור שינויים'}</button>
          </div>
        </form>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#0a3161] mb-4">מחיקת איש קשר</h3>
            <p className="text-[#3a3a3d] mb-6">האם אתה בטוח שברצונך למחוק את איש הקשר <strong>{formData.lastName} {formData.firstName}</strong>?<br /><span className="text-sm text-[#8f8f96]">פעולה זו אינה ניתנת לביטול.</span></p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className="px-4 py-2 border border-[#e2e4e8] rounded-lg hover:bg-[#f5f6f8] transition-colors">ביטול</button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">{deleting && <Loader2 size={16} className="animate-spin" />}{deleting ? 'מוחק...' : 'מחק'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// src/app/dashboard/contacts/new/page.tsx
// Version: 20260126-V3-CATEGORIES
// UI-015: Added dirty state warning
// UI-025, UI-016, UI-017, UI-024: Added success toast
// UI-013: Added error clearing on form change
// V3-CATEGORIES: Multi-select contact types with dynamic categories
// ============================================

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Save, Building2, Loader2, Info, Search, X, ChevronDown } from 'lucide-react'
import { ORG_TYPES, CONTACT_TYPES, getCategoriesForTypes, hasOtherType, isOnlyOtherType } from '@/lib/contact-constants'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { useToast } from '@/components/Toast'

interface Organization {
  id: string
  name: string
  type: string | null
  contactTypes?: string[]
  disciplines?: string[]
}

export default function NewContactPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showSuccess, showError: showErrorToast } = useToast()
  const projectId = searchParams?.get('projectId')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [orgMode, setOrgMode] = useState<'existing' | 'new' | 'independent'>('existing')
  const [inheritedFromOrg, setInheritedFromOrg] = useState(false)

  // Searchable organization dropdown state
  const [orgSearch, setOrgSearch] = useState('')
  const [showOrgDropdown, setShowOrgDropdown] = useState(false)

  // UI-015: Track if form has been modified
  const [isDirty, setIsDirty] = useState(false)

  // Close org dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.org-dropdown-container')) {
        setShowOrgDropdown(false)
      }
    }
    if (showOrgDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showOrgDropdown])

  // Filter organizations by search
  const filteredOrganizations = useMemo(() => {
    if (!orgSearch) return organizations
    return organizations.filter(o => o.name.includes(orgSearch))
  }, [organizations, orgSearch])

  // UI-015: Warn before navigating away from unsaved changes
  useUnsavedChangesWarning(isDirty)

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', phone: '', phoneAlt: '',
    email: '', emailAlt: '', linkedinUrl: '', photoUrl: '',
    organizationId: '', role: '', department: '',
    contactTypes: [] as string[],
    categories: [] as string[],  // renamed from disciplines
    otherText: '',  // for "אחר" free text
    notes: '',
  })

  const [newOrg, setNewOrg] = useState({ name: '', type: 'חברה פרטית', phone: '', email: '' })

  useEffect(() => { fetchOrganizations() }, [])

  // When organization is selected, inherit its contact types and categories
  useEffect(() => {
    if (orgMode === 'existing' && formData.organizationId) {
      const selectedOrg = organizations.find(o => o.id === formData.organizationId)
      if (selectedOrg && (selectedOrg.contactTypes?.length || selectedOrg.disciplines?.length)) {
        setFormData(prev => ({
          ...prev,
          contactTypes: selectedOrg.contactTypes || prev.contactTypes,
          categories: selectedOrg.disciplines || prev.categories,
        }))
        setInheritedFromOrg(true)
      }
    } else {
      setInheritedFromOrg(false)
    }
  }, [formData.organizationId, organizations, orgMode])

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

  const fetchOrganizations = async () => {
    try {
      // Use dropdown=true to get all organizations without pagination
      const res = await fetch('/api/organizations?dropdown=true')
      if (res.ok) {
        const data = await res.json()
        // dropdown mode returns array directly, not paginated
        setOrganizations(Array.isArray(data) ? data : data.items || [])
      }
    } catch (error) { console.error('Error:', error) }
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
      let organizationId = formData.organizationId

      if (orgMode === 'new' || orgMode === 'independent') {
        const orgData = orgMode === 'independent'
          ? { name: `${formData.firstName} ${formData.lastName}`, type: 'עצמאי' }
          : newOrg

        const orgRes = await fetch('/api/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orgData),
        })
        if (!orgRes.ok) throw new Error('Failed to create organization')
        const org = await orgRes.json()
        organizationId = org.id
      }

      // Prepare data for API - map categories to disciplines field for DB compatibility
      const contactData = {
        ...formData,
        disciplines: formData.categories,  // DB field is still called disciplines
        organizationId,
        projectId,
      }

      const contactRes = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData),
      })

      if (!contactRes.ok) throw new Error('Failed to create contact')
      const contact = await contactRes.json()

      // UI-015: Clear dirty state before navigation
      setIsDirty(false)
      // UI-025, UI-016, UI-017, UI-024: Show success confirmation
      showSuccess('איש הקשר נוצר בהצלחה')

      if (projectId) router.push(`/dashboard/projects/${projectId}?tab=contacts`)
      else router.push(`/dashboard/contacts/${contact.id}`)
    } catch (err) {
      setError('שגיאה ביצירת איש הקשר')
      showErrorToast('שגיאה ביצירת איש הקשר')
      console.error(err)
    } finally { setSaving(false) }
  }

  const toggleContactType = (type: string) => {
    // UI-013: Clear error when field is corrected
    if (error) setError('')
    // UI-015: Mark as dirty
    if (!isDirty) setIsDirty(true)
    setInheritedFromOrg(false)  // User has modified inherited values
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
    // UI-015: Mark as dirty
    if (!isDirty) setIsDirty(true)
    setInheritedFromOrg(false)  // User has modified inherited values
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }))
  }

  // UI-013, UI-015: Helper for updating form data with dirty tracking
  const updateFormData = (updates: Partial<typeof formData>) => {
    if (error) setError('')
    if (!isDirty) setIsDirty(true)
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const showCategoriesSection = formData.contactTypes.length > 0 && !isOnlyOtherType(formData.contactTypes)
  const showOtherTextField = hasOtherType(formData.contactTypes)

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-6 pb-0">
        <div className="flex items-center gap-4 mb-6">
          <Link href={projectId ? `/dashboard/projects/${projectId}?tab=contacts` : "/dashboard/contacts"} className="p-2 hover:bg-[#f5f6f8] rounded-lg transition-colors"><ArrowRight size={20} className="text-[#3a3a3d]" /></Link>
          <h1 className="text-2xl font-bold text-[#0a3161]">איש קשר חדש</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
          {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">{error}</div>}

          {/* פרטים אישיים */}
          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="text-lg font-semibold text-[#0a3161] mb-4">פרטים אישיים</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">שם פרטי <span className="text-red-500">*</span></label><input type="text" value={formData.firstName} onChange={(e) => updateFormData({ firstName: e.target.value })} required className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">שם משפחה <span className="text-red-500">*</span></label><input type="text" value={formData.lastName} onChange={(e) => updateFormData({ lastName: e.target.value })} required className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">טלפון נייד <span className="text-red-500">*</span></label><input type="tel" value={formData.phone} onChange={(e) => updateFormData({ phone: e.target.value })} required className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">אימייל</label><input type="email" value={formData.email} onChange={(e) => updateFormData({ email: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">LinkedIn</label><input type="url" value={formData.linkedinUrl} onChange={(e) => updateFormData({ linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/..." className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">קישור לתמונה</label><input type="url" value={formData.photoUrl} onChange={(e) => updateFormData({ photoUrl: e.target.value })} placeholder="https://..." className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
            </div>
          </div>

          {/* שיוך ארגוני */}
          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="text-lg font-semibold text-[#0a3161] mb-4">שיוך ארגוני</h2>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={orgMode === 'existing'} onChange={() => setOrgMode('existing')} className="w-4 h-4 text-[#0a3161]" /><span>ארגון קיים</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={orgMode === 'new'} onChange={() => setOrgMode('new')} className="w-4 h-4 text-[#0a3161]" /><span>ארגון חדש</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={orgMode === 'independent'} onChange={() => setOrgMode('independent')} className="w-4 h-4 text-[#0a3161]" /><span>עצמאי</span></label>
            </div>

            {orgMode === 'existing' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#3a3a3d] mb-1">ארגון</label>
                  {/* Searchable organization dropdown */}
                  <div className="relative org-dropdown-container">
                    <div
                      className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg bg-white cursor-pointer flex items-center justify-between"
                      onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                    >
                      <span className={formData.organizationId ? 'text-[#3a3a3d]' : 'text-[#8f8f96]'}>
                        {formData.organizationId
                          ? organizations.find(o => o.id === formData.organizationId)?.name
                          : 'בחר ארגון'}
                      </span>
                      <div className="flex items-center gap-1">
                        {formData.organizationId && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); updateFormData({ organizationId: '' }) }}
                            className="text-[#8f8f96] hover:text-[#3a3a3d] p-1"
                          >
                            <X size={14} />
                          </button>
                        )}
                        <ChevronDown size={16} className="text-[#8f8f96]" />
                      </div>
                    </div>
                    {showOrgDropdown && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[#e2e4e8] rounded-lg shadow-lg z-50 max-h-[300px] overflow-hidden flex flex-col">
                        <div className="p-2 border-b border-[#e2e4e8] sticky top-0 bg-white">
                          <div className="relative">
                            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8f8f96]" />
                            <input
                              type="text"
                              placeholder="חיפוש ארגון..."
                              value={orgSearch}
                              onChange={(e) => setOrgSearch(e.target.value)}
                              className="w-full pr-9 pl-3 py-2 border border-[#e2e4e8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto flex-1">
                          <div
                            className="px-4 py-2 hover:bg-[#f5f6f8] cursor-pointer text-sm text-[#8f8f96]"
                            onClick={() => { updateFormData({ organizationId: '' }); setShowOrgDropdown(false); setOrgSearch('') }}
                          >
                            ללא ארגון
                          </div>
                          {filteredOrganizations.length === 0 ? (
                            <div className="px-4 py-2 text-sm text-[#8f8f96]">לא נמצאו תוצאות</div>
                          ) : filteredOrganizations.map(org => (
                            <div
                              key={org.id}
                              className={`px-4 py-2 hover:bg-[#f5f6f8] cursor-pointer text-sm ${formData.organizationId === org.id ? 'bg-[#0a3161]/10 text-[#0a3161]' : ''}`}
                              onClick={() => { updateFormData({ organizationId: org.id }); setShowOrgDropdown(false); setOrgSearch('') }}
                            >
                              {org.name}
                              {org.type && <span className="text-xs text-[#8f8f96] mr-2">({org.type})</span>}
                            </div>
                          ))}
                        </div>
                        <div className="p-2 border-t border-[#e2e4e8] text-xs text-[#8f8f96] text-center">
                          {filteredOrganizations.length} ארגונים
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">תפקיד</label><input type="text" value={formData.role} onChange={(e) => updateFormData({ role: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg" /></div>
              </div>
            )}

            {orgMode === 'new' && (
              <div className="bg-[#f5f6f8] rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 text-[#0a3161] font-medium"><Building2 size={18} /><span>פרטי הארגון החדש</span></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">שם הארגון <span className="text-red-500">*</span></label><input type="text" value={newOrg.name} onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} required={orgMode === 'new'} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg bg-white" /></div>
                  <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">סוג ארגון</label><select value={newOrg.type} onChange={(e) => setNewOrg({ ...newOrg, type: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg bg-white">{ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">תפקיד בארגון</label><input type="text" value={formData.role} onChange={(e) => updateFormData({ role: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg bg-white" /></div>
                </div>
              </div>
            )}

            {orgMode === 'independent' && (
              <div className="bg-[#f5f6f8] rounded-lg p-4 text-sm text-[#8f8f96]">ייצר ארגון אוטומטי על שם איש הקשר</div>
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
                    onChange={(e) => updateFormData({ otherText: e.target.value })}
                    placeholder="הזן תיאור..."
                    className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* הערות */}
          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="text-lg font-semibold text-[#0a3161] mb-4">הערות</h2>
            <textarea value={formData.notes} onChange={(e) => updateFormData({ notes: e.target.value })} rows={4} placeholder="הערות נוספות..." className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161] resize-none" />
          </div>

          {/* כפתורים */}
          <div className="flex justify-end gap-3 sticky bottom-0 bg-[#f5f6f8] py-4 -mx-6 px-6">
            <Link href={projectId ? `/dashboard/projects/${projectId}?tab=contacts` : "/dashboard/contacts"} className="px-6 py-2 border border-[#e2e4e8] rounded-lg hover:bg-white transition-colors">ביטול</Link>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-[#0a3161] text-white rounded-lg hover:bg-[#0a3161]/90 transition-colors disabled:opacity-50">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}{saving ? 'שומר...' : 'שמור'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

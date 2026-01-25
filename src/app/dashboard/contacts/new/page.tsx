// ============================================
// src/app/dashboard/contacts/new/page.tsx
// Version: 20260124
// UI-015: Added dirty state warning
// UI-025, UI-016, UI-017, UI-024: Added success toast
// UI-013: Added error clearing on form change
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Save, Building2, Loader2, User, Upload } from 'lucide-react'
import { ORG_TYPES, CONTACT_TYPES, DISCIPLINES } from '@/lib/contact-constants'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { useToast } from '@/components/Toast'

interface Organization { id: string; name: string; type: string | null }


export default function NewContactPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showSuccess, showError: showErrorToast } = useToast()
  const projectId = searchParams?.get('projectId')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [orgMode, setOrgMode] = useState<'existing' | 'new' | 'independent'>('existing')

  // UI-015: Track if form has been modified
  const [isDirty, setIsDirty] = useState(false)

  // UI-015: Warn before navigating away from unsaved changes
  useUnsavedChangesWarning(isDirty)
  
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', phone: '', phoneAlt: '',
    email: '', emailAlt: '', linkedinUrl: '', photoUrl: '',
    organizationId: '', role: '', department: '',
    contactTypes: [] as string[], disciplines: [] as string[], notes: '',
  })
  
  const [newOrg, setNewOrg] = useState({ name: '', type: 'חברה פרטית', phone: '', email: '' })

  useEffect(() => { fetchOrganizations() }, [])

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations')
      if (res.ok) setOrganizations(await res.json())
    } catch (error) { console.error('Error:', error) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // וולידציה - שדות חובה
    if (formData.contactTypes.length === 0) {
      setError('יש לבחור לפחות סוג איש קשר אחד')
      return
    }
    if (formData.disciplines.length === 0) {
      setError('יש לבחור לפחות דיסציפלינה אחת')
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

      const contactRes = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, organizationId, projectId }),
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

  const toggleArrayField = (field: 'contactTypes' | 'disciplines', value: string) => {
    // UI-013: Clear error when field is corrected
    if (error) setError('')
    // UI-015: Mark as dirty
    if (!isDirty) setIsDirty(true)
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter(v => v !== value) : [...prev[field], value]
    }))
  }

  // UI-013, UI-015: Helper for updating form data with dirty tracking
  const updateFormData = (updates: Partial<typeof formData>) => {
    if (error) setError('')
    if (!isDirty) setIsDirty(true)
    setFormData(prev => ({ ...prev, ...updates }))
  }

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
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">שם פרטי <span className="text-red-500">*</span></label><input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">שם משפחה <span className="text-red-500">*</span></label><input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">טלפון נייד <span className="text-red-500">*</span></label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">אימייל</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">LinkedIn</label><input type="url" value={formData.linkedinUrl} onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/..." className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">קישור לתמונה</label><input type="url" value={formData.photoUrl} onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })} placeholder="https://..." className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
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
                <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">ארגון</label><select value={formData.organizationId} onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg"><option value="">בחר ארגון</option>{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">תפקיד</label><input type="text" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg" /></div>
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
                  <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">תפקיד בארגון</label><input type="text" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg bg-white" /></div>
                </div>
              </div>
            )}

            {orgMode === 'independent' && (
              <div className="bg-[#f5f6f8] rounded-lg p-4 text-sm text-[#8f8f96]">ייצר ארגון אוטומטי על שם איש הקשר</div>
            )}
          </div>

          {/* קטגוריזציה */}
          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="text-lg font-semibold text-[#0a3161] mb-4">קטגוריזציה</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3a3a3d] mb-2">סוג איש קשר <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {CONTACT_TYPES.map(type => (
                    <button key={type} type="button" onClick={() => toggleArrayField('contactTypes', type)} className={`px-4 py-2 rounded-lg border transition-colors ${formData.contactTypes.includes(type) ? 'bg-[#0a3161] text-white border-[#0a3161]' : 'bg-white text-[#3a3a3d] border-[#e2e4e8] hover:border-[#0a3161]'}`}>{type}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3a3a3d] mb-2">דיסציפלינה <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {DISCIPLINES.map(disc => (
                    <button key={disc} type="button" onClick={() => toggleArrayField('disciplines', disc)} className={`px-4 py-2 rounded-lg border transition-colors ${formData.disciplines.includes(disc) ? 'bg-[#0a3161] text-white border-[#0a3161]' : 'bg-white text-[#3a3a3d] border-[#e2e4e8] hover:border-[#0a3161]'}`}>{disc}</button>
                  ))}
                </div>
              </div>
            </div>
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
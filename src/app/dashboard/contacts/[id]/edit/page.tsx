// ============================================
// src/app/dashboard/contacts/[id]/edit/page.tsx
// Version: 20260124
// UI-015: Added dirty state warning
// UI-025, UI-016, UI-017, UI-024: Added success toast
// UI-013: Added error clearing on form change
// ============================================

'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Save, Trash2, Loader2 } from 'lucide-react'
import { CONTACT_TYPES, DISCIPLINES } from '@/lib/contact-constants'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { useToast } from '@/components/Toast'

interface Organization { id: string; name: string; type: string | null }

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

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', nickname: '', phone: '', phoneAlt: '',
    email: '', emailAlt: '', linkedinUrl: '', organizationId: '',
    role: '', department: '', contactTypes: [] as string[],
    disciplines: [] as string[], status: 'פעיל', notes: '',
  })

  // UI-015: Track original data for dirty state detection
  const originalDataRef = useRef<string>('')
  const isDirty = originalDataRef.current !== '' && originalDataRef.current !== JSON.stringify(formData)

  // UI-015: Warn before navigating away from unsaved changes
  useUnsavedChangesWarning(isDirty)

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchOrganizations(), fetchContact()])
    }
    loadData()
  }, [contactId])

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations')
      if (res.ok) setOrganizations(await res.json())
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
          disciplines: contact.disciplines || [],
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
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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

  const toggleArrayField = (field: 'contactTypes' | 'disciplines', value: string) => {
    // UI-013: Clear error when field is corrected
    if (error) setError('')
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter(v => v !== value) : [...prev[field], value]
    }))
  }

  // UI-013: Helper to clear error on any field change
  const handleFieldChange = (field: string, value: string) => {
    if (error) setError('')
    setFormData(prev => ({ ...prev, [field]: value }))
  }

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
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">שם פרטי <span className="text-red-500">*</span></label><input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">שם משפחה <span className="text-red-500">*</span></label><input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">טלפון נייד <span className="text-red-500">*</span></label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">טלפון נוסף</label><input type="tel" value={formData.phoneAlt} onChange={(e) => setFormData({ ...formData, phoneAlt: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">אימייל</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">אימייל נוסף</label><input type="email" value={formData.emailAlt} onChange={(e) => setFormData({ ...formData, emailAlt: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="text-lg font-semibold text-[#0a3161] mb-4">שיוך ארגוני</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">ארגון</label><select value={formData.organizationId} onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"><option value="">בחר ארגון</option>{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">תפקיד בארגון</label><input type="text" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" /></div>
            </div>
          </div>

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

          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="text-lg font-semibold text-[#0a3161] mb-4">סטטוס והערות</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">סטטוס</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full max-w-xs px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"><option value="פעיל">פעיל</option><option value="לא פעיל">לא פעיל</option></select></div>
              <div><label className="block text-sm font-medium text-[#3a3a3d] mb-1">הערות</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={4} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161] resize-none" /></div>
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
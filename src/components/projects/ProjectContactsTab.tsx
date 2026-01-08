'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, User, Building2, Phone, Mail, ChevronUp, ChevronDown, X, Check, Loader2, UserPlus, Pencil, Trash2 } from 'lucide-react'

interface Organization { id: string; name: string; type: string | null }
interface Contact { id: string; firstName: string; lastName: string; phone: string; email: string | null; role: string | null; organization: Organization | null }
interface ContactProject {
  id: string
  contact: Contact
  project: { id: string; name: string; projectNumber: string; level: string }
  roleInProject: string | null
  status: string
  updatedAt: string
  updatedBy: { name: string | null; employee: { firstName: string; lastName: string } | null } | null
}

type SortField = 'name' | 'organization' | 'roleInProject' | 'phone' | 'status'
type SortDirection = 'asc' | 'desc'

interface Props { projectId: string; projectName: string; projectNumber: string; projectLevel: string }

export default function ProjectContactsTab({ projectId, projectName, projectNumber, projectLevel }: Props) {
  const [contacts, setContacts] = useState<ContactProject[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactProject | null>(null)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  
  // Add modal state
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [roleInProject, setRoleInProject] = useState('')
  const [statusInProject, setStatusInProject] = useState('פעיל')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchContacts() }, [projectId])

  const fetchContacts = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/contacts`)
      if (res.ok) setContacts(await res.json())
    } catch (error) { console.error('Error:', error) }
    finally { setLoading(false) }
  }

  const fetchAllContacts = async () => {
    try {
      const res = await fetch('/api/contacts')
      if (res.ok) setAllContacts(await res.json())
    } catch (error) { console.error('Error:', error) }
  }

  const openAddModal = () => {
    setShowAddModal(true)
    setSearchTerm('')
    setSelectedContact(null)
    setRoleInProject('')
    fetchAllContacts()
  }

  const openEditModal = (cp: ContactProject) => {
    setEditingContact(cp)
    setRoleInProject(cp.roleInProject || '')
    setStatusInProject(cp.status)
    setShowEditModal(true)
  }

  const openDeleteModal = (cp: ContactProject) => {
    setEditingContact(cp)
    setShowDeleteModal(true)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  const handleAddContact = async () => {
    if (!selectedContact) return
    setAdding(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: selectedContact.id, roleInProject }),
      })
      if (res.ok) {
        await fetchContacts()
        setShowAddModal(false)
      } else {
        const err = await res.json()
        alert(err.error || 'שגיאה בהוספת איש קשר')
      }
    } catch (error) { console.error('Error:', error) }
    finally { setAdding(false) }
  }

  const handleUpdateContact = async () => {
    if (!editingContact) return
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/contacts/${editingContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleInProject, status: statusInProject }),
      })
      if (res.ok) {
        await fetchContacts()
        setShowEditModal(false)
        setEditingContact(null)
      } else {
        alert('שגיאה בעדכון')
      }
    } catch (error) { console.error('Error:', error) }
    finally { setSaving(false) }
  }

  const handleDeleteContact = async () => {
    if (!editingContact) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/contacts/${editingContact.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await fetchContacts()
        setShowDeleteModal(false)
        setEditingContact(null)
      } else {
        alert('שגיאה במחיקה')
      }
    } catch (error) { console.error('Error:', error) }
    finally { setDeleting(false) }
  }

  // Filter contacts that aren't already in project
  const existingContactIds = contacts.map(c => c.contact.id)
  const filteredAvailable = allContacts.filter(c => {
    if (existingContactIds.includes(c.id)) return false
    if (!searchTerm) return true
    const fullName = `${c.lastName} ${c.firstName}`.toLowerCase()
    return fullName.includes(searchTerm.toLowerCase()) || 
           c.phone?.includes(searchTerm) ||
           c.organization?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const sortedContacts = [...contacts].sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case 'name': cmp = `${a.contact.lastName} ${a.contact.firstName}`.localeCompare(`${b.contact.lastName} ${b.contact.firstName}`); break
      case 'organization': cmp = (a.contact.organization?.name || '').localeCompare(b.contact.organization?.name || ''); break
      case 'roleInProject': cmp = (a.roleInProject || '').localeCompare(b.roleInProject || ''); break
      case 'phone': cmp = (a.contact.phone || '').localeCompare(b.contact.phone || ''); break
      case 'status': cmp = a.status.localeCompare(b.status); break
    }
    return sortDirection === 'asc' ? cmp : -cmp
  })

  const getSourceLabel = (cp: ContactProject) => {
    if (cp.project.id === projectId) return null
    return cp.project.name
  }

  const isDirectContact = (cp: ContactProject) => cp.project.id === projectId

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#0a3161]" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#0a3161]">אנשי קשר</h2>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-[#0a3161] text-white rounded-lg hover:bg-[#0a3161]/90 transition-colors">
          <Plus size={18} /><span>הוסף איש קשר</span>
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e2e4e8] p-12 text-center">
          <User size={48} className="mx-auto text-[#e2e4e8] mb-4" />
          <div className="text-[#8f8f96]">אין אנשי קשר</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#e2e4e8] overflow-hidden">
          <div className="grid grid-cols-[2fr_1.5fr_1fr_120px_80px_80px_70px] items-center gap-3 p-3 bg-[#f5f6f8] border-b border-[#e2e4e8] text-sm text-[#3a3a3d] font-medium">
            <div onClick={() => handleSort('name')} className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>שם</span>{sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
            <div onClick={() => handleSort('organization')} className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>ארגון/חברה</span>{sortField === 'organization' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
            <div onClick={() => handleSort('roleInProject')} className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>תפקיד בפרויקט</span>{sortField === 'roleInProject' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
            <div onClick={() => handleSort('phone')} className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>טלפון</span>{sortField === 'phone' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
            <div onClick={() => handleSort('status')} className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>סטטוס</span>{sortField === 'status' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
            <div>מקור</div>
            <div>פעולות</div>
          </div>
          {sortedContacts.map((cp) => (
            <div key={cp.id} className="grid grid-cols-[2fr_1.5fr_1fr_120px_80px_80px_70px] items-center gap-3 p-3 hover:bg-[#f5f6f8] border-b border-[#e2e4e8] transition-colors">
              <Link href={`/dashboard/contacts/${cp.contact.id}`} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><User size={18} className="text-[#0a3161]" /></div>
                <div>
                  <div className="font-medium text-[#0a3161] hover:underline">{cp.contact.lastName} {cp.contact.firstName}</div>
                  {cp.contact.email && <div className="text-xs text-[#8f8f96] flex items-center gap-1"><Mail size={12} />{cp.contact.email}</div>}
                </div>
              </Link>
              <div className="text-sm text-[#3a3a3d] flex items-center gap-2"><Building2 size={14} className="text-[#8f8f96]" />{cp.contact.organization?.name || <span className="text-[#a7a7b0]">עצמאי</span>}</div>
              <div className="text-sm text-[#3a3a3d]">{cp.roleInProject || <span className="text-[#a7a7b0]">-</span>}</div>
              <div className="text-sm text-[#3a3a3d]">{cp.contact.phone}</div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium text-center ${cp.status === 'פעיל' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{cp.status}</span>
              <div className="text-xs text-[#8f8f96]">{getSourceLabel(cp) || <span className="text-green-600">ישיר</span>}</div>
              <div className="flex items-center gap-1">
                {isDirectContact(cp) ? (
                  <>
                    <button onClick={() => openEditModal(cp)} className="p-1.5 text-[#8f8f96] hover:text-[#0a3161] hover:bg-[#0a3161]/10 rounded transition-colors" title="עריכה"><Pencil size={14} /></button>
                    <button onClick={() => openDeleteModal(cp)} className="p-1.5 text-[#8f8f96] hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="הסרה"><Trash2 size={14} /></button>
                  </>
                ) : (
                  <span className="text-xs text-[#a7a7b0]">-</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#0a3161]">הוספת איש קשר לפרויקט</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-[#f5f6f8] rounded"><X size={20} /></button>
            </div>

            {selectedContact ? (
              <div className="space-y-4">
                <div className="bg-[#f5f6f8] rounded-lg p-4 flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><User size={24} className="text-[#0a3161]" /></div>
                  <div className="flex-1">
                    <div className="font-medium text-[#0a3161]">{selectedContact.lastName} {selectedContact.firstName}</div>
                    <div className="text-sm text-[#8f8f96]">{selectedContact.organization?.name || 'עצמאי'} • {selectedContact.phone}</div>
                  </div>
                  <button onClick={() => setSelectedContact(null)} className="text-[#8f8f96] hover:text-red-600"><X size={18} /></button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3a3a3d] mb-1">תפקיד בפרויקט</label>
                  <input type="text" value={roleInProject} onChange={(e) => setRoleInProject(e.target.value)} placeholder="למשל: מנהל פרויקט מטעם הלקוח" className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-[#e2e4e8] rounded-lg hover:bg-[#f5f6f8]">ביטול</button>
                  <button onClick={handleAddContact} disabled={adding} className="flex items-center gap-2 px-4 py-2 bg-[#0a3161] text-white rounded-lg hover:bg-[#0a3161]/90 disabled:opacity-50">
                    {adding ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    {adding ? 'מוסיף...' : 'הוסף לפרויקט'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="relative mb-4">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8f8f96]" size={18} />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="חפש לפי שם, טלפון או ארגון..." className="w-full pr-10 pl-4 py-2 border border-[#e2e4e8] rounded-lg" />
                </div>

                <div className="flex-1 overflow-y-auto border border-[#e2e4e8] rounded-lg">
                  {filteredAvailable.length === 0 ? (
                    <div className="p-8 text-center">
                      <User size={32} className="mx-auto text-[#e2e4e8] mb-2" />
                      <div className="text-[#8f8f96] mb-4">{searchTerm ? 'לא נמצאו תוצאות' : 'אין אנשי קשר זמינים'}</div>
                      <Link href={`/dashboard/contacts/new?projectId=${projectId}`} className="inline-flex items-center gap-2 text-[#0a3161] hover:underline">
                        <UserPlus size={18} /><span>צור איש קשר חדש</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#e2e4e8]">
                      {filteredAvailable.slice(0, 20).map(contact => (
                        <button key={contact.id} onClick={() => setSelectedContact(contact)} className="w-full flex items-center gap-3 p-3 hover:bg-[#f5f6f8] transition-colors text-right">
                          <div className="w-10 h-10 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><User size={18} className="text-[#0a3161]" /></div>
                          <div className="flex-1">
                            <div className="font-medium text-[#0a3161]">{contact.lastName} {contact.firstName}</div>
                            <div className="text-sm text-[#8f8f96]">{contact.organization?.name || 'עצמאי'}</div>
                          </div>
                          <div className="text-sm text-[#8f8f96]">{contact.phone}</div>
                        </button>
                      ))}
                      {filteredAvailable.length > 20 && <div className="p-3 text-center text-sm text-[#8f8f96]">עוד {filteredAvailable.length - 20} תוצאות...</div>}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-[#e2e4e8]">
                  <Link href={`/dashboard/contacts/new?projectId=${projectId}`} className="flex items-center justify-center gap-2 w-full py-2 border border-[#0a3161] text-[#0a3161] rounded-lg hover:bg-[#0a3161]/5 transition-colors">
                    <UserPlus size={18} /><span>צור איש קשר חדש</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditModal && editingContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#0a3161]">עריכת איש קשר בפרויקט</h3>
              <button onClick={() => { setShowEditModal(false); setEditingContact(null) }} className="p-1 hover:bg-[#f5f6f8] rounded"><X size={20} /></button>
            </div>

            <div className="bg-[#f5f6f8] rounded-lg p-4 flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><User size={24} className="text-[#0a3161]" /></div>
              <div>
                <div className="font-medium text-[#0a3161]">{editingContact.contact.lastName} {editingContact.contact.firstName}</div>
                <div className="text-sm text-[#8f8f96]">{editingContact.contact.organization?.name || 'עצמאי'}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">תפקיד בפרויקט</label>
                <input type="text" value={roleInProject} onChange={(e) => setRoleInProject(e.target.value)} placeholder="למשל: מנהל פרויקט מטעם הלקוח" className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">סטטוס בפרויקט</label>
                <select value={statusInProject} onChange={(e) => setStatusInProject(e.target.value)} className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg">
                  <option value="פעיל">פעיל</option>
                  <option value="לא פעיל">לא פעיל</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowEditModal(false); setEditingContact(null) }} className="px-4 py-2 border border-[#e2e4e8] rounded-lg hover:bg-[#f5f6f8]">ביטול</button>
              <button onClick={handleUpdateContact} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#0a3161] text-white rounded-lg hover:bg-[#0a3161]/90 disabled:opacity-50">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {saving ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && editingContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-600">הסרת איש קשר מהפרויקט</h3>
              <button onClick={() => { setShowDeleteModal(false); setEditingContact(null) }} className="p-1 hover:bg-[#f5f6f8] rounded"><X size={20} /></button>
            </div>

            <p className="text-[#3a3a3d] mb-4">
              האם להסיר את <strong>{editingContact.contact.lastName} {editingContact.contact.firstName}</strong> מהפרויקט?
            </p>
            <p className="text-sm text-[#8f8f96] mb-6">
              פעולה זו תסיר את הקישור בין איש הקשר לפרויקט. איש הקשר עצמו לא יימחק מהמערכת.
            </p>

            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowDeleteModal(false); setEditingContact(null) }} className="px-4 py-2 border border-[#e2e4e8] rounded-lg hover:bg-[#f5f6f8]">ביטול</button>
              <button onClick={handleDeleteContact} disabled={deleting} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                {deleting ? 'מוסיר...' : 'הסר מהפרויקט'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

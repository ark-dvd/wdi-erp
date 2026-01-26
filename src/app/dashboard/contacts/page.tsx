'use client'

// /home/user/wdi-erp/src/app/dashboard/contacts/page.tsx
// Version: 20260125-SERVER-PAGINATION
// Implements server-side pagination and search

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, Trash2, Edit, ChevronUp, ChevronDown, User, Building2, Phone, Mail, FolderKanban, Globe, Loader2, Star, ChevronLeft, ChevronRight } from 'lucide-react'

interface Organization {
  id: string
  name: string
  type: string | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  isVendor: boolean
  averageRating: number | null
  reviewCount: number
  _count?: { contacts: number }
  updatedAt: string
  updatedBy: { name: string | null; employee: { firstName: string; lastName: string } | null } | null
}

interface Contact {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  role: string | null
  organization: Organization | null
  contactTypes: string[]
  disciplines: string[]
  status: string
  averageRating: number | null
  reviewCount: number
  projects: { status: string }[]
  updatedAt: string
  updatedBy: { name: string | null; employee: { firstName: string; lastName: string } | null } | null
}

type ContactSortField = 'name' | 'organization' | 'role' | 'type' | 'rating' | 'activeProjects' | 'updatedAt'
type OrgSortField = 'name' | 'type' | 'rating' | 'contacts' | 'updatedAt'
type SortDirection = 'asc' | 'desc'

const CONTACT_TYPES = ['לקוח', 'ספק', 'יועץ', 'קבלן', 'רשות', 'מפקח', 'אחר']
const DISCIPLINES = ['אדריכלות', 'קונסטרוקציה', 'חשמל', 'אינסטלציה', 'מיזוג', 'בטיחות', 'נגישות', 'תנועה', 'קרקע', 'אקוסטיקה', 'אחר']
const ORG_TYPES = ['חברה פרטית', 'חברה ציבורית', 'עמותה', 'רשות ממשלתית', 'רשות מקומית', 'עצמאי']

export default function ContactsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams?.get('tab') === 'organizations' ? 'organizations' : 'contacts'
  
  const [activeTab, setActiveTab] = useState<'contacts' | 'organizations'>(initialTab)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [contactsTotal, setContactsTotal] = useState<number>(0)
  const [orgsTotal, setOrgsTotal] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [disciplineFilter, setDisciplineFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [orgTypeFilter, setOrgTypeFilter] = useState('')
  const [contactSortField, setContactSortField] = useState<ContactSortField>('name')
  const [orgSortField, setOrgSortField] = useState<OrgSortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Pagination state
  const [contactsPage, setContactsPage] = useState(1)
  const [orgsPage, setOrgsPage] = useState(1)
  const [contactsPages, setContactsPages] = useState(1)
  const [orgsPages, setOrgsPages] = useState(1)
  const [contactsHasNext, setContactsHasNext] = useState(false)
  const [orgsHasNext, setOrgsHasNext] = useState(false)
  const ITEMS_PER_PAGE = 20

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      // Reset to page 1 when search changes
      setContactsPage(1)
      setOrgsPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch data when filters/pagination change
  useEffect(() => {
    if (activeTab === 'contacts') {
      fetchContacts()
    }
  }, [debouncedSearch, typeFilter, disciplineFilter, statusFilter, contactsPage, contactSortField, sortDirection, activeTab])

  useEffect(() => {
    if (activeTab === 'organizations') {
      fetchOrganizations()
    }
  }, [debouncedSearch, orgTypeFilter, orgsPage, orgSortField, sortDirection, activeTab])

  // Build query string for contacts API
  const buildContactsQuery = useCallback(() => {
    const params = new URLSearchParams()
    params.set('page', contactsPage.toString())
    params.set('limit', ITEMS_PER_PAGE.toString())
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (typeFilter) params.set('type', typeFilter)
    if (disciplineFilter) params.set('discipline', disciplineFilter)
    if (statusFilter) params.set('status', statusFilter)
    // Map frontend sort fields to API fields
    const sortFieldMap: Record<ContactSortField, string> = {
      name: 'lastName',
      organization: 'lastName', // API doesn't support org sort, fallback to name
      role: 'lastName', // API doesn't support role sort, fallback to name
      type: 'lastName', // API doesn't support type sort, fallback to name
      rating: 'lastName', // API doesn't support rating sort, fallback to name
      activeProjects: 'lastName', // API doesn't support projects sort, fallback to name
      updatedAt: 'updatedAt'
    }
    params.set('sortBy', sortFieldMap[contactSortField])
    params.set('sortDir', sortDirection)
    return params.toString()
  }, [contactsPage, debouncedSearch, typeFilter, disciplineFilter, statusFilter, contactSortField, sortDirection])

  // Build query string for organizations API
  const buildOrgsQuery = useCallback(() => {
    const params = new URLSearchParams()
    params.set('page', orgsPage.toString())
    params.set('limit', ITEMS_PER_PAGE.toString())
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (orgTypeFilter) params.set('type', orgTypeFilter)
    // Map frontend sort fields to API fields
    const sortFieldMap: Record<OrgSortField, string> = {
      name: 'name',
      type: 'type',
      rating: 'name', // API doesn't support rating sort, fallback to name
      contacts: 'name', // API doesn't support contacts sort, fallback to name
      updatedAt: 'updatedAt'
    }
    params.set('sortBy', sortFieldMap[orgSortField])
    params.set('sortDir', sortDirection)
    return params.toString()
  }, [orgsPage, debouncedSearch, orgTypeFilter, orgSortField, sortDirection])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      const query = buildContactsQuery()
      const res = await fetch(`/api/contacts?${query}`)
      if (res.ok) {
        const data = await res.json()
        setContacts(data.items || data)
        const pagination = data.pagination
        if (pagination) {
          setContactsTotal(pagination.total)
          setContactsPages(pagination.pages)
          setContactsHasNext(pagination.hasNext)
        } else {
          setContactsTotal(data.items?.length || data.length || 0)
          setContactsPages(1)
          setContactsHasNext(false)
        }
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const query = buildOrgsQuery()
      const res = await fetch(`/api/organizations?${query}`)
      if (res.ok) {
        const data = await res.json()
        setOrganizations(data.items || data)
        const pagination = data.pagination
        if (pagination) {
          setOrgsTotal(pagination.total)
          setOrgsPages(pagination.pages)
          setOrgsHasNext(pagination.hasNext)
        } else {
          setOrgsTotal(data.items?.length || data.length || 0)
          setOrgsPages(1)
          setOrgsHasNext(false)
        }
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContactSort = (field: ContactSortField) => {
    if (contactSortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    else { setContactSortField(field); setSortDirection('asc') }
    setContactsPage(1) // Reset to first page on sort change
  }

  const handleOrgSort = (field: OrgSortField) => {
    if (orgSortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    else { setOrgSortField(field); setSortDirection('asc') }
    setOrgsPage(1) // Reset to first page on sort change
  }

  // Filter change handlers - reset to page 1
  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value)
    setContactsPage(1)
  }

  const handleDisciplineFilterChange = (value: string) => {
    setDisciplineFilter(value)
    setContactsPage(1)
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setContactsPage(1)
  }

  const handleOrgTypeFilterChange = (value: string) => {
    setOrgTypeFilter(value)
    setOrgsPage(1)
  }

  const handleDeleteContact = async (id: string, name: string) => {
    if (!confirm(`האם למחוק את איש הקשר "${name}"?`)) return
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        // Refresh current page data from server
        fetchContacts()
      } else {
        alert('שגיאה במחיקת איש הקשר')
      }
    } catch (error) {
      console.error('Error deleting contact:', error)
      alert('שגיאה במחיקת איש הקשר')
    }
  }

  const handleDeleteOrg = async (id: string, name: string) => {
    if (!confirm(`האם למחוק את הארגון "${name}"?`)) return
    try {
      const res = await fetch(`/api/organizations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        // Refresh current page data from server
        fetchOrganizations()
      } else {
        alert('שגיאה במחיקת הארגון')
      }
    } catch (error) {
      console.error('Error deleting organization:', error)
      alert('שגיאה במחיקת הארגון')
    }
  }

  const formatDateTime = (date: string | null) => {
    if (!date) return '-'
    const d = new Date(date)
    return `${d.toLocaleDateString('he-IL')} ${d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`
  }

  const getUpdaterName = (updatedBy: Contact['updatedBy'] | Organization['updatedBy']) => {
    if (!updatedBy) return ''
    if (updatedBy.name === 'WDI Agent' || updatedBy.name === 'system') return 'WDI Agent'
    if (updatedBy.employee) return `${updatedBy.employee.firstName} ${updatedBy.employee.lastName}`
    return updatedBy.name || ''
  }

  const getActiveProjectsCount = (contact: Contact) => contact.projects?.filter(p => p.status === 'פעיל').length || 0

  // Server-side pagination - data comes pre-filtered and sorted from API
  // Use contacts and organizations directly (no client-side filtering needed)

  const renderRating = (rating: number | null, count: number) => {
    if (!count || count === 0) return <span className="text-[#a7a7b0]">-</span>
    return (
      <div className="flex items-center gap-1">
        <Star size={14} className="fill-amber-400 text-amber-400" />
        <span className="text-sm font-medium">{rating?.toFixed(1)}</span>
        <span className="text-xs text-[#8f8f96]">({count})</span>
      </div>
    )
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-[#0a3161]" /></div>

  return (
    <div className="-m-6 flex flex-col h-[calc(100vh-0px)]">
      <div className="flex-shrink-0 bg-gray-50 p-6 pb-0">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0a3161]">אנשי קשר</h1>
            <p className="text-[#8f8f96] mt-1">{activeTab === 'contacts' ? `${contactsTotal.toLocaleString('he-IL')} אנשי קשר` : `${orgsTotal.toLocaleString('he-IL')} ארגונים`}</p>
          </div>
          <Link href={activeTab === 'contacts' ? "/dashboard/contacts/new" : "/dashboard/contacts/org/new"} className="flex items-center gap-2 px-4 py-2 bg-[#0a3161] text-white rounded-lg hover:bg-[#0a3161]/90 transition-colors">
            <Plus size={20} />
            <span>{activeTab === 'contacts' ? 'איש קשר חדש' : 'ארגון חדש'}</span>
          </Link>
        </div>
        <div className="flex gap-2 border-b border-[#e2e4e8] mb-4">
          <button onClick={() => { setActiveTab('contacts'); setSearch(''); setTypeFilter(''); setDisciplineFilter(''); setStatusFilter(''); setContactsPage(1) }} className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'contacts' ? 'text-[#0a3161]' : 'text-[#8f8f96] hover:text-[#3a3a3d]'}`}>
            <div className="flex items-center gap-2"><User size={18} /><span>אנשי קשר</span><span className="bg-[#e2e4e8] px-2 py-0.5 rounded-full text-xs">{contactsTotal.toLocaleString('he-IL')}</span></div>
            {activeTab === 'contacts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0a3161]"></div>}
          </button>
          <button onClick={() => { setActiveTab('organizations'); setSearch(''); setOrgTypeFilter(''); setOrgsPage(1) }} className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'organizations' ? 'text-[#0a3161]' : 'text-[#8f8f96] hover:text-[#3a3a3d]'}`}>
            <div className="flex items-center gap-2"><Building2 size={18} /><span>ארגונים</span><span className="bg-[#e2e4e8] px-2 py-0.5 rounded-full text-xs">{orgsTotal.toLocaleString('he-IL')}</span></div>
            {activeTab === 'organizations' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0a3161]"></div>}
          </button>
        </div>
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8f8f96]" size={20} />
            <input type="text" placeholder={activeTab === 'contacts' ? "חיפוש לפי שם, טלפון, אימייל או ארגון..." : "חיפוש לפי שם, טלפון או אימייל..."} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pr-10 pl-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]" />
          </div>
          {activeTab === 'contacts' ? (
            <>
              <select value={typeFilter} onChange={(e) => handleTypeFilterChange(e.target.value)} className="px-4 py-2 border border-[#e2e4e8] rounded-lg"><option value="">כל הסוגים</option>{CONTACT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select>
              <select value={disciplineFilter} onChange={(e) => handleDisciplineFilterChange(e.target.value)} className="px-4 py-2 border border-[#e2e4e8] rounded-lg"><option value="">כל הדיסציפלינות</option>{DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}</select>
              <select value={statusFilter} onChange={(e) => handleStatusFilterChange(e.target.value)} className="px-4 py-2 border border-[#e2e4e8] rounded-lg"><option value="">כל הסטטוסים</option><option value="פעיל">פעיל</option><option value="לא פעיל">לא פעיל</option></select>
            </>
          ) : (
            <select value={orgTypeFilter} onChange={(e) => handleOrgTypeFilterChange(e.target.value)} className="px-4 py-2 border border-[#e2e4e8] rounded-lg"><option value="">כל הסוגים</option>{ORG_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select>
          )}
        </div>
        {activeTab === 'contacts' ? (
          <div className="bg-white rounded-t-xl border border-b-0 border-[#e2e4e8]">
            <div className="grid grid-cols-[2fr_1.5fr_80px_1fr_120px_1fr_80px_1fr_80px] items-center gap-3 p-3 bg-[#f5f6f8] text-sm text-[#3a3a3d] font-medium rounded-t-xl">
              <div onClick={() => handleContactSort('name')} className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>שם</span>{contactSortField === 'name' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
              <div onClick={() => handleContactSort('organization')} className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>ארגון</span>{contactSortField === 'organization' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
              <div onClick={() => handleContactSort('rating')} className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>דירוג</span>{contactSortField === 'rating' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
              <div onClick={() => handleContactSort('role')} className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>תפקיד</span>{contactSortField === 'role' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
              <div>טלפון</div>
              <div onClick={() => handleContactSort('type')} className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>סוג</span>{contactSortField === 'type' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
              <div onClick={() => handleContactSort('activeProjects')} className="flex items-center justify-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>פרויקטים</span>{contactSortField === 'activeProjects' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
              <div onClick={() => handleContactSort('updatedAt')} className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>עודכן</span>{contactSortField === 'updatedAt' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
              <div>פעולות</div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-t-xl border border-b-0 border-[#e2e4e8]">
            <div className="grid grid-cols-[2fr_1fr_80px_120px_150px_100px_1fr_80px] items-center gap-3 p-3 bg-[#f5f6f8] text-sm text-[#3a3a3d] font-medium rounded-t-xl">
              <div onClick={() => handleOrgSort('name')} className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>שם הארגון</span>{orgSortField === 'name' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
              <div onClick={() => handleOrgSort('type')} className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>סוג</span>{orgSortField === 'type' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
              <div onClick={() => handleOrgSort('rating')} className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>דירוג</span>{orgSortField === 'rating' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
              <div>טלפון</div>
              <div>אימייל</div>
              <div onClick={() => handleOrgSort('contacts')} className="flex items-center justify-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>אנשי קשר</span>{orgSortField === 'contacts' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
              <div onClick={() => handleOrgSort('updatedAt')} className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"><span>עודכן</span>{orgSortField === 'updatedAt' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
              <div>פעולות</div>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {activeTab === 'contacts' ? (
          <div className="bg-white rounded-b-xl border border-t-0 border-[#e2e4e8]">
            {contacts.length === 0 ? (
              <div className="text-center py-12 text-[#8f8f96]">{loading ? 'טוען...' : 'לא נמצאו אנשי קשר'}</div>
            ) : contacts.map((contact) => (
              <div key={contact.id} className="grid grid-cols-[2fr_1.5fr_80px_1fr_120px_1fr_80px_1fr_80px] items-center gap-3 p-3 hover:bg-[#f5f6f8] border-b border-[#e2e4e8] cursor-pointer transition-colors" onClick={() => router.push(`/dashboard/contacts/${contact.id}`)}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><User size={18} className="text-[#0a3161]" /></div>
                  <div>
                    <div className="font-medium text-[#0a3161]">{contact.lastName} {contact.firstName}</div>
                    {contact.email && <div className="text-xs text-[#8f8f96] flex items-center gap-1"><Mail size={12} />{contact.email}</div>}
                  </div>
                </div>
                <div className="text-sm text-[#3a3a3d] flex items-center gap-2 cursor-pointer hover:text-[#0a3161]" onClick={(e) => { e.stopPropagation(); if (contact.organization) router.push(`/dashboard/contacts/org/${contact.organization.id}`) }}><Building2 size={14} className="text-[#8f8f96]" />{contact.organization?.name || <span className="text-[#a7a7b0]">עצמאי</span>}</div>
                <div>{renderRating(contact.averageRating, contact.reviewCount)}</div>
                <div className="text-sm text-[#3a3a3d]">{contact.role || <span className="text-[#a7a7b0]">-</span>}</div>
                <div className="text-sm text-[#3a3a3d] flex items-center gap-1"><Phone size={14} className="text-[#8f8f96]" /><span className="tabular-nums">{contact.phone}</span></div>
                <div className="flex flex-wrap gap-1">{contact.contactTypes?.slice(0, 2).map(type => <span key={type} className="px-2 py-0.5 bg-[#0a3161]/10 text-[#0a3161] text-xs rounded">{type}</span>)}{contact.contactTypes?.length > 2 && <span className="text-xs text-[#8f8f96]">+{contact.contactTypes.length - 2}</span>}</div>
                <div className="text-sm text-[#3a3a3d] text-center flex items-center justify-center gap-1"><FolderKanban size={14} className="text-[#8f8f96]" />{getActiveProjectsCount(contact)}</div>
                <div className="text-sm text-[#8f8f96]">
                  <div>{formatDateTime(contact.updatedAt)}</div>
                  {getUpdaterName(contact.updatedBy) && <div className="text-xs">{getUpdaterName(contact.updatedBy)}</div>}
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/dashboard/contacts/${contact.id}/edit`} onClick={(e) => e.stopPropagation()} className="p-2 text-[#a7a7b0] hover:text-[#0a3161] transition-colors" title="עריכה"><Edit size={18} /></Link>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact.id, `${contact.firstName} ${contact.lastName}`) }} className="p-2 text-[#a7a7b0] hover:text-red-600 transition-colors" title="מחיקה"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-b-xl border border-t-0 border-[#e2e4e8]">
            {organizations.length === 0 ? (
              <div className="text-center py-12 text-[#8f8f96]">{loading ? 'טוען...' : 'לא נמצאו ארגונים'}</div>
            ) : organizations.map((org) => (
              <div key={org.id} className="grid grid-cols-[2fr_1fr_80px_120px_150px_100px_1fr_80px] items-center gap-3 p-3 hover:bg-[#f5f6f8] border-b border-[#e2e4e8] cursor-pointer transition-colors" onClick={() => router.push(`/dashboard/contacts/org/${org.id}`)}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><Building2 size={18} className="text-[#0a3161]" /></div>
                  <div>
                    <div className="font-medium text-[#0a3161]">{org.name}</div>
                    {org.website && <div className="text-xs text-[#8f8f96] flex items-center gap-1"><Globe size={12} />{org.website.replace('https://', '').replace('http://', '')}</div>}
                  </div>
                </div>
                <div className="text-sm text-[#3a3a3d]">{org.type || <span className="text-[#a7a7b0]">-</span>}</div>
                <div>{renderRating(org.averageRating, org.reviewCount)}</div>
                <div className="text-sm text-[#3a3a3d]">{org.phone || <span className="text-[#a7a7b0]">-</span>}</div>
                <div className="text-sm text-[#3a3a3d] truncate">{org.email || <span className="text-[#a7a7b0]">-</span>}</div>
                <div className="text-sm text-[#3a3a3d] text-center flex items-center justify-center gap-1"><User size={14} className="text-[#8f8f96]" />{org._count?.contacts || 0}</div>
                <div className="text-sm text-[#8f8f96]">
                  <div>{formatDateTime(org.updatedAt)}</div>
                  {getUpdaterName(org.updatedBy) && <div className="text-xs">{getUpdaterName(org.updatedBy)}</div>}
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/dashboard/contacts/org/${org.id}/edit`} onClick={(e) => e.stopPropagation()} className="p-2 text-[#a7a7b0] hover:text-[#0a3161] transition-colors" title="עריכה"><Edit size={18} /></Link>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteOrg(org.id, org.name) }} className="p-2 text-[#a7a7b0] hover:text-red-600 transition-colors" title="מחיקה"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {activeTab === 'contacts' && contactsPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white rounded-xl border border-[#e2e4e8]">
            <div className="text-sm text-[#8f8f96]">
              עמוד {contactsPage.toLocaleString('he-IL')} מתוך {contactsPages.toLocaleString('he-IL')} ({contactsTotal.toLocaleString('he-IL')} אנשי קשר)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setContactsPage(p => Math.max(1, p - 1))}
                disabled={contactsPage === 1 || loading}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-[#e2e4e8] rounded-lg hover:bg-[#f5f6f8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
                הקודם
              </button>
              <button
                onClick={() => setContactsPage(p => p + 1)}
                disabled={!contactsHasNext || loading}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-[#e2e4e8] rounded-lg hover:bg-[#f5f6f8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                הבא
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'organizations' && orgsPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white rounded-xl border border-[#e2e4e8]">
            <div className="text-sm text-[#8f8f96]">
              עמוד {orgsPage.toLocaleString('he-IL')} מתוך {orgsPages.toLocaleString('he-IL')} ({orgsTotal.toLocaleString('he-IL')} ארגונים)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOrgsPage(p => Math.max(1, p - 1))}
                disabled={orgsPage === 1 || loading}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-[#e2e4e8] rounded-lg hover:bg-[#f5f6f8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
                הקודם
              </button>
              <button
                onClick={() => setOrgsPage(p => p + 1)}
                disabled={!orgsHasNext || loading}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-[#e2e4e8] rounded-lg hover:bg-[#f5f6f8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                הבא
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

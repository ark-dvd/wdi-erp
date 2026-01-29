'use client'

// /home/user/wdi-erp/src/app/dashboard/contacts/[id]/page.tsx
// Version: 20251221-123000

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Edit, User, Building2, Phone, Mail, FolderKanban, Linkedin, Loader2, Trash2, Star } from 'lucide-react'

interface IndividualReview {
  id: string
  avgRating: number
  generalNotes: string | null
  createdAt: string
  externalProjectName: string | null
  reviewer: { id: string; name: string | null; employee: { firstName: string; lastName: string } | null }
  project: { id: string; name: string; projectNumber: string } | null
}

interface Contact {
  id: string
  firstName: string
  lastName: string
  nickname: string | null
  phone: string
  phoneAlt: string | null
  email: string | null
  emailAlt: string | null
  linkedinUrl: string | null
  role: string | null
  department: string | null
  contactTypes: string[]
  disciplines: string[]
  status: string
  notes: string | null
  averageRating: number | null
  reviewCount: number
  organization: { id: string; name: string; type: string | null } | null
  projects: Array<{ id: string; roleInProject: string | null; status: string; project: { id: string; name: string; projectNumber: string } }>
  individualReviews: IndividualReview[]
  _count?: { individualReviews: number }
  updatedAt: string
  updatedBy: { name: string | null; employee: { firstName: string; lastName: string } | null } | null
}

export default function ContactViewPage() {
  const params = useParams()
  const router = useRouter()
  const contactId = params?.id as string
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'details' | 'projects' | 'ratings'>('details')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchContact() }, [contactId])

  const fetchContact = async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}`)
      if (res.ok) setContact(await res.json())
      else router.push('/dashboard/contacts')
    } catch (error) {
      console.error('Error fetching contact:', error)
      router.push('/dashboard/contacts')
    } finally { setLoading(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' })
      if (res.ok) router.push('/dashboard/contacts')
    } catch (err) { console.error('Error deleting:', err) }
    finally { setDeleting(false); setShowDeleteModal(false) }
  }

  const formatDateTime = (date: string) => {
    const d = new Date(date)
    return `${d.toLocaleDateString('he-IL')} ${d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString('he-IL')

  const getUpdatedByName = () => {
    if (!contact?.updatedBy) return '-'
    if (contact.updatedBy.employee) return `${contact.updatedBy.employee.firstName} ${contact.updatedBy.employee.lastName}`
    return contact.updatedBy.name || '-'
  }

  const getReviewerName = (reviewer: { name: string | null; employee: { firstName: string; lastName: string } | null }) => {
    if (reviewer.employee) return `${reviewer.employee.firstName} ${reviewer.employee.lastName}`
    return reviewer.name || '-'
  }

  const getStatusClass = (status: string) => status === 'פעיל' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
          />
        ))}
        <span className="mr-1 text-sm font-medium text-[#3a3a3d]">{rating.toFixed(1)}</span>
      </div>
    )
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-[#0a3161]" /></div>
  if (!contact) return null

  const activeProjects = contact.projects?.filter(p => p.status === 'פעיל') || []
  const historicalProjects = contact.projects?.filter(p => p.status !== 'פעיל') || []

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-6 pb-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/contacts" className="p-2 hover:bg-[#f5f6f8] rounded-lg transition-colors"><ArrowRight size={20} className="text-[#3a3a3d]" /></Link>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><User size={32} className="text-[#0a3161]" /></div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-[#0a3161]">{contact.lastName} {contact.firstName}</h1>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(contact.status)}`}>{contact.status}</span>
                  {contact.reviewCount > 0 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-full">
                      <Star size={14} className="fill-amber-400 text-amber-400" />
                      <span className="text-sm font-medium text-amber-700">{contact.averageRating?.toFixed(1)}</span>
                      <span className="text-xs text-amber-600">({contact.reviewCount})</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[#8f8f96] mt-1">
                  <Building2 size={16} /><span>{contact.organization?.name || 'ללא ארגון'}</span>
                  {contact.role && <span>• {contact.role}</span>}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDeleteModal(true)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={20} /></button>
            <Link href={`/dashboard/contacts/${contact.id}/edit`} className="flex items-center gap-2 px-4 py-2 bg-[#0a3161] text-white rounded-lg hover:bg-[#0a3161]/90 transition-colors"><Edit size={18} /><span>עריכה</span></Link>
          </div>
        </div>
        <div className="flex gap-2 border-b border-[#e2e4e8]">
          <button onClick={() => setActiveTab('details')} className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'details' ? 'text-[#0a3161]' : 'text-[#8f8f96] hover:text-[#3a3a3d]'}`}>פרטים{activeTab === 'details' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0a3161]"></div>}</button>
          <button onClick={() => setActiveTab('projects')} className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'projects' ? 'text-[#0a3161]' : 'text-[#8f8f96] hover:text-[#3a3a3d]'}`}>פרויקטים ({contact.projects?.length || 0}){activeTab === 'projects' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0a3161]"></div>}</button>
          <button onClick={() => setActiveTab('ratings')} className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'ratings' ? 'text-[#0a3161]' : 'text-[#8f8f96] hover:text-[#3a3a3d]'}`}>
            דירוגים ({contact.reviewCount || 0})
            {activeTab === 'ratings' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0a3161]"></div>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'details' && (
          <div className="max-w-4xl space-y-6">
            <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
              <h2 className="text-lg font-semibold text-[#0a3161] mb-4">פרטי קשר</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><Phone size={18} className="text-[#0a3161]" /></div><div><div className="text-xs text-[#8f8f96]">טלפון</div><div className="font-medium text-[#0a3161]">{contact.phone}</div></div></div>
                {contact.phoneAlt && <div className="flex items-center gap-3"><div className="w-10 h-10 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><Phone size={18} className="text-[#0a3161]" /></div><div><div className="text-xs text-[#8f8f96]">טלפון נוסף</div><div className="font-medium text-[#0a3161]">{contact.phoneAlt}</div></div></div>}
                {contact.email && <div className="flex items-center gap-3"><div className="w-10 h-10 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><Mail size={18} className="text-[#0a3161]" /></div><div><div className="text-xs text-[#8f8f96]">אימייל</div><a href={`mailto:${contact.email}`} className="font-medium text-[#0a3161] hover:underline">{contact.email}</a></div></div>}
                {contact.emailAlt && <div className="flex items-center gap-3"><div className="w-10 h-10 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><Mail size={18} className="text-[#0a3161]" /></div><div><div className="text-xs text-[#8f8f96]">אימייל נוסף</div><a href={`mailto:${contact.emailAlt}`} className="font-medium text-[#0a3161] hover:underline">{contact.emailAlt}</a></div></div>}
                {contact.linkedinUrl && <div className="flex items-center gap-3"><div className="w-10 h-10 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><Linkedin size={18} className="text-[#0a3161]" /></div><div><div className="text-xs text-[#8f8f96]">LinkedIn</div><a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-[#0a3161] hover:underline">פרופיל LinkedIn</a></div></div>}
              </div>
            </div>

            {contact.organization && (
              <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
                <h2 className="text-lg font-semibold text-[#0a3161] mb-4">שיוך ארגוני</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div><div className="text-sm text-[#8f8f96]">ארגון</div><Link href={`/dashboard/contacts/org/${contact.organization.id}`} className="font-medium text-[#0a3161] hover:underline">{contact.organization.name}</Link></div>
                  {contact.organization.type && <div><div className="text-sm text-[#8f8f96]">סוג ארגון</div><div className="font-medium">{contact.organization.type}</div></div>}
                  {contact.role && <div><div className="text-sm text-[#8f8f96]">תפקיד</div><div className="font-medium">{contact.role}</div></div>}
                  {contact.department && <div><div className="text-sm text-[#8f8f96]">מחלקה</div><div className="font-medium">{contact.department}</div></div>}
                </div>
              </div>
            )}

            {(contact.contactTypes?.length > 0 || contact.disciplines?.length > 0) && (
              <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
                <h2 className="text-lg font-semibold text-[#0a3161] mb-4">קטגוריזציה</h2>
                <div className="space-y-4">
                  {contact.contactTypes?.length > 0 && <div><div className="text-sm text-[#8f8f96] mb-2">סוג</div><div className="flex flex-wrap gap-2">{contact.contactTypes.map(t => <span key={t} className="px-3 py-1 bg-[#0a3161]/10 text-[#0a3161] rounded-full text-sm">{t}</span>)}</div></div>}
                  {contact.disciplines?.length > 0 && <div><div className="text-sm text-[#8f8f96] mb-2">דיסציפלינה</div><div className="flex flex-wrap gap-2">{contact.disciplines.map(d => <span key={d} className="px-3 py-1 bg-[#0a3161]/10 text-[#0a3161] rounded-full text-sm">{d}</span>)}</div></div>}
                </div>
              </div>
            )}

            {contact.notes && <div className="bg-white rounded-xl border border-[#e2e4e8] p-6"><h2 className="text-lg font-semibold text-[#0a3161] mb-4">הערות</h2><p className="text-[#3a3a3d] whitespace-pre-wrap">{contact.notes}</p></div>}

            <div className="text-sm text-[#8f8f96] flex items-center gap-4"><span>עודכן: {formatDateTime(contact.updatedAt)}</span><span>•</span><span>ע"י: {getUpdatedByName()}</span></div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-6">
            {activeProjects.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[#8f8f96] mb-3">פרויקטים פעילים ({activeProjects.length})</h3>
                <div className="bg-white rounded-xl border border-[#e2e4e8] overflow-hidden divide-y divide-[#e2e4e8]">
                  {activeProjects.map(cp => (
                    <Link key={cp.id} href={`/dashboard/projects/${cp.project.id}`} className="flex items-center gap-4 p-4 hover:bg-[#f5f6f8] transition-colors">
                      <div className="w-10 h-10 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><FolderKanban size={20} className="text-[#0a3161]" /></div>
                      <div className="flex-1"><div className="font-medium text-[#0a3161]">{cp.project.name}</div><div className="text-sm text-[#8f8f96]"><span dir="ltr">#{cp.project.projectNumber}</span>{cp.roleInProject && ` • ${cp.roleInProject}`}</div></div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(cp.status)}`}>{cp.status}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {historicalProjects.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[#8f8f96] mb-3">היסטוריה ({historicalProjects.length})</h3>
                <div className="bg-white rounded-xl border border-[#e2e4e8] overflow-hidden divide-y divide-[#e2e4e8]">
                  {historicalProjects.map(cp => (
                    <Link key={cp.id} href={`/dashboard/projects/${cp.project.id}`} className="flex items-center gap-4 p-4 hover:bg-[#f5f6f8] transition-colors opacity-70">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><FolderKanban size={20} className="text-gray-500" /></div>
                      <div className="flex-1"><div className="font-medium text-[#3a3a3d]">{cp.project.name}</div><div className="text-sm text-[#8f8f96]"><span dir="ltr">#{cp.project.projectNumber}</span>{cp.roleInProject && ` • ${cp.roleInProject}`}</div></div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(cp.status)}`}>{cp.status}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {contact.projects?.length === 0 && (
              <div className="bg-white rounded-xl border border-[#e2e4e8] p-12 text-center">
                <FolderKanban size={48} className="mx-auto text-[#e2e4e8] mb-4" />
                <div className="text-[#8f8f96]">איש הקשר לא משויך לפרויקטים</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ratings' && (
          <div className="max-w-4xl space-y-6">
            {/* סיכום דירוג */}
            {contact.reviewCount > 0 && (
              <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[#0a3161]">{contact.averageRating?.toFixed(1)}</div>
                    <div className="flex items-center justify-center gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={18}
                          className={star <= Math.round(contact.averageRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                    <div className="text-sm text-[#8f8f96] mt-1">{contact.reviewCount} דירוגים</div>
                  </div>
                </div>
              </div>
            )}

            {/* רשימת דירוגים */}
            {contact.individualReviews?.length > 0 ? (
              <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
                <h2 className="text-lg font-semibold text-[#0a3161] mb-4">דירוגים</h2>
                <div className="divide-y divide-[#e2e4e8]">
                  {contact.individualReviews.map((review) => (
                    <Link 
                      key={review.id} 
                      href={`/dashboard/individual-reviews/${review.id}`}
                      className="block py-4 first:pt-0 last:pb-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {renderStars(review.avgRating)}
                          </div>
                          <div className="text-sm text-[#3a3a3d]">
                            {review.project ? (
                              <><span dir="ltr">#{review.project.projectNumber}</span> {review.project.name}</>
                            ) : (
                              <span className="text-orange-600">{review.externalProjectName} (חיצוני)</span>
                            )}
                          </div>
                          {review.generalNotes && (
                            <div className="text-sm text-[#8f8f96] mt-2 bg-gray-50 p-2 rounded">
                              {review.generalNotes}
                            </div>
                          )}
                          <div className="text-xs text-[#8f8f96] mt-2">
                            דורג ע"י {getReviewerName(review.reviewer)} • {formatDate(review.createdAt)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#e2e4e8] p-12 text-center">
                <Star size={48} className="mx-auto text-[#e2e4e8] mb-4" />
                <div className="text-[#8f8f96]">אין דירוגים לאיש קשר זה</div>
              </div>
            )}
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#0a3161] mb-4">מחיקת איש קשר</h3>
            <p className="text-[#3a3a3d] mb-6">האם למחוק את <strong>{contact.lastName} {contact.firstName}</strong>?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border border-[#e2e4e8] rounded-lg hover:bg-[#f5f6f8]">ביטול</button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">{deleting && <Loader2 size={16} className="animate-spin" />}{deleting ? 'מוחק...' : 'מחק'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

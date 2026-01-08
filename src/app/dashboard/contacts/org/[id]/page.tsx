'use client'

// /home/user/wdi-erp/src/app/dashboard/contacts/org/[id]/page.tsx
// Version: 20251221-122000

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Edit, Building2, Phone, Mail, Globe, MapPin, FileText, User, Trash2, Loader2, Star } from 'lucide-react'

interface Contact {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  role: string | null
  status: string
  averageRating: number | null
  reviewCount: number
}

interface IndividualReview {
  id: string
  avgRating: number
  generalNotes: string | null
  createdAt: string
  reviewer: { id: string; name: string | null; employee: { firstName: string; lastName: string } | null }
  project: { id: string; name: string; projectNumber: string }
  contact: { id: string; firstName: string; lastName: string }
}

interface Organization {
  id: string
  name: string
  type: string | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  businessId: string | null
  logoUrl: string | null
  notes: string | null
  isVendor: boolean
  averageRating: number | null
  reviewCount: number
  contacts: Contact[]
  recentReviews?: IndividualReview[]
  updatedAt: string
  updatedBy: { name: string | null; employee: { firstName: string; lastName: string } | null } | null
}

export default function OrganizationViewPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params?.id as string
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchOrg() }, [orgId])

  const fetchOrg = async () => {
    try {
      const res = await fetch(`/api/organizations/${orgId}`)
      if (res.ok) setOrg(await res.json())
      else router.push('/dashboard/contacts?tab=organizations')
    } catch (error) {
      console.error('Error:', error)
      router.push('/dashboard/contacts?tab=organizations')
    } finally { setLoading(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/organizations/${orgId}`, { method: 'DELETE' })
      if (res.ok) router.push('/dashboard/contacts?tab=organizations')
    } catch (err) { console.error('Error:', err) }
    finally { setDeleting(false); setShowDeleteModal(false) }
  }

  const formatDateTime = (date: string) => {
    const d = new Date(date)
    return `${d.toLocaleDateString('he-IL')} ${d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString('he-IL')

  const getUpdatedByName = () => {
    if (!org?.updatedBy) return '-'
    if (org.updatedBy.employee) return `${org.updatedBy.employee.lastName} ${org.updatedBy.employee.firstName}`
    return org.updatedBy.name || '-'
  }

  const getReviewerName = (reviewer: { name: string | null; employee: { firstName: string; lastName: string } | null }) => {
    if (reviewer.employee) return `${reviewer.employee.firstName} ${reviewer.employee.lastName}`
    return reviewer.name || '-'
  }

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
  if (!org) return null

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-6 pb-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/contacts?tab=organizations" className="p-2 hover:bg-[#f5f6f8] rounded-lg transition-colors"><ArrowRight size={20} className="text-[#3a3a3d]" /></Link>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><Building2 size={32} className="text-[#0a3161]" /></div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-[#0a3161]">{org.name}</h1>
                  {org.isVendor && <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">ספק</span>}
                  {org.reviewCount > 0 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-full">
                      <Star size={14} className="fill-amber-400 text-amber-400" />
                      <span className="text-sm font-medium text-amber-700">{org.averageRating?.toFixed(1)}</span>
                      <span className="text-xs text-amber-600">({org.reviewCount})</span>
                    </div>
                  )}
                </div>
                {org.type && <div className="text-[#8f8f96] mt-1">{org.type}</div>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDeleteModal(true)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={20} /></button>
            <Link href={`/dashboard/contacts/org/${org.id}/edit`} className="flex items-center gap-2 px-4 py-2 bg-[#0a3161] text-white rounded-lg hover:bg-[#0a3161]/90 transition-colors"><Edit size={18} /><span>עריכה</span></Link>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl space-y-6">
          {/* פרטי קשר */}
          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <h2 className="text-lg font-semibold text-[#0a3161] mb-4">פרטי קשר</h2>
            <div className="grid grid-cols-2 gap-6">
              {org.phone && <div className="flex items-center gap-3"><div className="w-10 h-10 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><Phone size={18} className="text-[#0a3161]" /></div><div><div className="text-xs text-[#8f8f96]">טלפון</div><div className="font-medium text-[#0a3161]">{org.phone}</div></div></div>}
              {org.email && <div className="flex items-center gap-3"><div className="w-10 h-10 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><Mail size={18} className="text-[#0a3161]" /></div><div><div className="text-xs text-[#8f8f96]">אימייל</div><a href={`mailto:${org.email}`} className="font-medium text-[#0a3161] hover:underline">{org.email}</a></div></div>}
              {org.website && <div className="flex items-center gap-3"><div className="w-10 h-10 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><Globe size={18} className="text-[#0a3161]" /></div><div><div className="text-xs text-[#8f8f96]">אתר</div><a href={org.website} target="_blank" rel="noopener noreferrer" className="font-medium text-[#0a3161] hover:underline">{org.website.replace('https://', '').replace('http://', '')}</a></div></div>}
              {org.address && <div className="flex items-center gap-3"><div className="w-10 h-10 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><MapPin size={18} className="text-[#0a3161]" /></div><div><div className="text-xs text-[#8f8f96]">כתובת</div><div className="font-medium">{org.address}</div></div></div>}
              {org.businessId && <div className="flex items-center gap-3"><div className="w-10 h-10 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><FileText size={18} className="text-[#0a3161]" /></div><div><div className="text-xs text-[#8f8f96]">ח.פ / מספר עוסק</div><div className="font-medium">{org.businessId}</div></div></div>}
            </div>
          </div>

          {/* דירוגים */}
          {org.reviewCount > 0 && (
            <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold text-[#0a3161]">דירוגים</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          className={star <= Math.round(org.averageRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                    <span className="font-semibold text-[#0a3161]">{org.averageRating?.toFixed(1)}</span>
                    <span className="text-sm text-[#8f8f96]">({org.reviewCount} דירוגים)</span>
                  </div>
                </div>
              </div>
              {org.recentReviews && org.recentReviews.length > 0 ? (
                <div className="divide-y divide-[#e2e4e8]">
                  {org.recentReviews.map((review) => (
                    <Link key={review.id} href={`/dashboard/individual-reviews/${review.id}`} className="block py-4 first:pt-0 last:pb-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {renderStars(review.avgRating)}
                            <span className="text-sm text-[#0a3161] font-medium">
                              {review.contact.firstName} {review.contact.lastName}
                            </span>
                          </div>
                          <div className="text-sm text-[#3a3a3d]">
                            #{review.project.projectNumber} {review.project.name}
                          </div>
                          {review.generalNotes && (
                            <div className="text-sm text-[#8f8f96] mt-2 bg-gray-50 p-2 rounded">
                              {review.generalNotes}
                            </div>
                          )}
                          <div className="text-xs text-[#8f8f96] mt-1">
                            דורג ע"י {getReviewerName(review.reviewer)} • {formatDate(review.createdAt)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-[#8f8f96]">אין דירוגים עדיין</div>
              )}
            </div>
          )}

          {/* אנשי קשר */}
          <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#0a3161]">אנשי קשר ({org.contacts?.length || 0})</h2>
              <Link href={`/dashboard/contacts/new?organizationId=${org.id}`} className="text-sm text-[#0a3161] hover:underline">+ הוסף איש קשר</Link>
            </div>
            {org.contacts?.length === 0 ? (
              <div className="text-center py-8 text-[#8f8f96]">אין אנשי קשר בארגון זה</div>
            ) : (
              <div className="divide-y divide-[#e2e4e8]">
                {org.contacts?.map(contact => (
                  <Link key={contact.id} href={`/dashboard/contacts/${contact.id}`} className="flex items-center gap-4 py-3 hover:bg-[#f5f6f8] -mx-2 px-2 rounded-lg transition-colors">
                    <div className="w-10 h-10 bg-[#0a3161]/10 rounded-full flex items-center justify-center"><User size={18} className="text-[#0a3161]" /></div>
                    <div className="flex-1">
                      <div className="font-medium text-[#0a3161]">{contact.lastName} {contact.firstName}</div>
                      <div className="text-sm text-[#8f8f96]">{contact.role || 'ללא תפקיד'}</div>
                    </div>
                    {contact.averageRating && contact.averageRating > 0 && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star size={14} className="fill-amber-400 text-amber-400" />
                        <span className="text-amber-700">{contact.averageRating.toFixed(1)}</span>
                        <span className="text-[#8f8f96]">({contact.reviewCount})</span>
                      </div>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${contact.status === 'פעיל' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{contact.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* הערות */}
          {org.notes && (
            <div className="bg-white rounded-xl border border-[#e2e4e8] p-6">
              <h2 className="text-lg font-semibold text-[#0a3161] mb-4">הערות</h2>
              <p className="text-[#3a3a3d] whitespace-pre-wrap">{org.notes}</p>
            </div>
          )}

          <div className="text-sm text-[#8f8f96] flex items-center gap-4"><span>עודכן: {formatDateTime(org.updatedAt)}</span><span>•</span><span>ע"י: {getUpdatedByName()}</span></div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#0a3161] mb-4">מחיקת ארגון</h3>
            <p className="text-[#3a3a3d] mb-6">האם למחוק את <strong>{org.name}</strong>?{org.contacts?.length > 0 && <><br /><span className="text-red-600 text-sm">שים לב: לארגון יש {org.contacts.length} אנשי קשר משויכים.</span></>}</p>
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

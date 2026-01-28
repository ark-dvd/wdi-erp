'use client'

// ================================================
// WDI ERP - Project View Page
// Version: 20251211-143500
// Fixes: #15 dynamic buttons per tab
// ================================================

import ProjectContactsTab from '@/components/projects/ProjectContactsTab'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowRight, Edit, MapPin, Tag, Ruler, DollarSign,
  Calendar, Building2, Phone, Mail, Plus, Trash2, AlertTriangle, 
  Layers, Briefcase, Clock, ChevronLeft, FileText, Users, CalendarDays
} from 'lucide-react'

// ==========================================
// Constants
// ==========================================

const EVENT_TYPE_COLORS: Record<string, string> = {
  'אתגר': 'event-challenge',
  'תיעוד': 'event-documentation',
  'החלטה': 'event-decision',
  'לקוח': 'event-client',
  'בטיחות': 'event-safety',
  'סיכום פגישה': 'event-meeting',
  'אדמיניסטרציה': 'event-admin',
  'גבייה': 'event-billing',
  'אחר': 'event-other',
}

const STATE_COLORS: Record<string, string> = {
  'פעיל': 'state-active',
  'הושלם': 'state-completed',
  'מושהה': 'state-paused',
  'בוטל': 'state-cancelled',
}

// ==========================================
// Main Component
// ==========================================

export default function ProjectViewPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'details' | 'events' | 'contacts' | 'documents'>('details')
  const [events, setEvents] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchProject() }, [id])
  useEffect(() => { if (activeTab === 'events' && events.length === 0) fetchEvents() }, [activeTab])

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`)
      if (res.ok) setProject(await res.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEvents = async () => {
    setLoadingEvents(true)
    try {
      const res = await fetch(`/api/projects/${id}/events`)
      if (res.ok) setEvents(await res.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoadingEvents(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('האם למחוק אירוע זה?')) return
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' })
      if (res.ok) {
        setEvents(events.filter(e => e.id !== eventId))
      } else {
        const data = await res.json()
        alert(data.error || 'שגיאה במחיקת האירוע')
      }
    } catch (error) {
      alert('שגיאה במחיקת האירוע')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/dashboard/projects')
      } else {
        const data = await res.json()
        alert(data.error || 'שגיאה במחיקה')
      }
    } catch (error) {
      alert('שגיאה במחיקה')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // ==========================================
  // Helper Functions
  // ==========================================

  const formatDate = (date: string | null) => date ? new Date(date).toLocaleDateString('he-IL') : null
  
  const formatCurrency = (amount: number | null) => 
    amount ? new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount) : null
  const getStateClass = (state: string) => STATE_COLORS[state] || 'state-active'

  // Collect all contacts from project and children
  const getAllContacts = () => {
    const allContacts: any[] = []
    const seen = new Set<string>()
    
    // Add direct contacts
    project.contacts?.forEach((cp: any) => {
      if (!seen.has(cp.id)) {
        seen.add(cp.id)
        allContacts.push({ ...cp, source: project.name })
      }
    })
    
    // Add children contacts
    project.childrenContacts?.forEach((cp: any) => {
      if (!seen.has(cp.id)) {
        seen.add(cp.id)
        allContacts.push({ ...cp, source: cp.project?.name || 'תת-פרויקט' })
      }
    })
    
    return allContacts
  }
  const allContacts = project ? getAllContacts() : []

  // Calculate estimated cost for quarters/mega
  const calculateChildrenCost = (children: any[] | undefined): number => {
    if (!children || children.length === 0) return 0
    return children.reduce((sum, child) => {
      const childCost = child.estimatedCost || 0
      const grandChildrenCost = calculateChildrenCost(child.children)
      return sum + childCost + grandChildrenCost
    }, 0)
  }

  const getTotalEstimatedCost = (): number => {
    if (project.estimatedCost) return project.estimatedCost
    return calculateChildrenCost(project.children)
  }

  // ==========================================
  // Loading State
  // ==========================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a3161]"></div>
      </div>
    )
  }

  if (!project) return <div className="text-center py-12 text-[#8f8f96]">פרויקט לא נמצא</div>

  // ==========================================
  // Project Type Detection
  // ==========================================

  const isMegaProject = project.level === 'project' && project.projectType === 'mega'
  const isMultiOrQuarter = project.level === 'quarter' || (project.level === 'project' && project.projectType === 'multi')
  const isSingleBuilding = project.level === 'building' || (project.level === 'project' && project.projectType === 'single')

  const canAddQuarter = isMegaProject
  const canAddBuilding = isMultiOrQuarter

  const quarters = project.children?.filter((c: any) => c.level === 'quarter') || []
  const buildings = project.children?.filter((c: any) => c.level === 'building') || []

  // ==========================================
  // Breadcrumb Builder
  // ==========================================

  const getBreadcrumbs = () => {
    const crumbs: { label: string; href: string; current?: boolean }[] = [
      { label: 'פרויקטים', href: '/dashboard/projects' }
    ]

    if (project.parent?.parent) {
      // Building in quarter in mega
      crumbs.push({ 
        label: `${project.parent.parent.projectNumber} ${project.parent.parent.name}`, 
        href: `/dashboard/projects/${project.parent.parent.id}` 
      })
      crumbs.push({ 
        label: project.parent.name, 
        href: `/dashboard/projects/${project.parent.id}` 
      })
    } else if (project.parent) {
      // Quarter in mega or building in multi
      crumbs.push({ 
        label: `${project.parent.projectNumber} ${project.parent.name}`, 
        href: `/dashboard/projects/${project.parent.id}` 
      })
    }

    crumbs.push({ 
      label: project.name, 
      href: `/dashboard/projects/${project.id}`,
      current: true 
    })

    return crumbs
  }

  // ==========================================
  // #15: Dynamic Buttons per Tab
  // ==========================================

  const renderActionButtons = () => {
    switch (activeTab) {
      case 'details':
        return (
          <>
            {canAddQuarter && (
              <Link href={`/dashboard/projects/new?parentId=${id}&type=quarter`} className="btn btn-secondary">
                <Layers size={18} /> הוסף אזור/רובע
              </Link>
            )}
            {canAddBuilding && (
              <Link href={`/dashboard/projects/new?parentId=${id}&type=building`} className="btn btn-secondary">
                <Plus size={18} /> הוסף מבנה
              </Link>
            )}
            <Link href={`/dashboard/projects/${id}/edit`} className="btn btn-secondary">
              <Edit size={18} /> עריכה
            </Link>
            <button onClick={() => setShowDeleteConfirm(true)} className="btn btn-danger">
              <Trash2 size={18} />
            </button>
          </>
        )
      case 'events':
        return (
          <>
            <Link href={`/dashboard/events/new?projectId=${id}`} className="btn btn-primary">
              <Plus size={18} /> הוסף אירוע
            </Link>
          </>
        )
      case 'contacts':
        return (
          <>
            {/* כפתור הוספת איש קשר מנוהל בתוך ProjectContactsTab */}
          </>
        )
      default:
        return null
    }
  }

  // ==========================================
  // Render
  // ==========================================

  return (
    <div className="space-y-6">
      
      {/* ==========================================
          Breadcrumb
          ========================================== */}
      <nav className="breadcrumb">
        {getBreadcrumbs().map((crumb, index, arr) => (
          <span key={crumb.href} className="flex items-center gap-2">
            {index > 0 && <ChevronLeft size={14} className="breadcrumb-separator" />}
            {crumb.current ? (
              <span className="breadcrumb-item current">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="breadcrumb-item hover:underline">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* ==========================================
          Header
          ========================================== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={project.parent ? `/dashboard/projects/${project.parent.id}` : '/dashboard/projects'}
            className="p-2 hover:bg-[#f5f6f8] rounded-lg transition-colors"
          >
            <ArrowRight size={20} className="text-[#3a3a3d]" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xl text-[#0a3161] font-bold" dir="ltr">#{project.projectNumber}</span>
              <h1 className="text-2xl font-bold text-[#3a3a3d]">{project.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStateClass(project.state)}`}>
                {project.state}
              </span>
            </div>
            {project.phase && (
              <div className="flex items-center gap-2 text-[#8f8f96] mt-1">
                <Clock size={14} />
                <span>שלב: {project.phase}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* #15: כפתורים דינמיים לפי טאב - במיקום קבוע */}
        <div className="flex items-center gap-2 min-h-[40px]">
          {renderActionButtons()}
        </div>
      </div>

      {/* ==========================================
          Tabs
          ========================================== */}
      <div className="tabs">
        <button
          onClick={() => setActiveTab('details')}
          className={`tab ${activeTab === 'details' ? 'active' : ''}`}
        >
          <FileText size={18} />
          פרטים
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`tab ${activeTab === 'events' ? 'active' : ''}`}
        >
          <CalendarDays size={18} />
          אירועים
          <span className="tab-badge">{project._count?.events || 0}</span>
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`tab ${activeTab === 'contacts' ? 'active' : ''}`}
        >
          <Users size={18} />
          אנשי קשר
          <span className="tab-badge">{allContacts.length}</span>
        </button>
      </div>

      {/* ==========================================
          Details Tab
          ========================================== */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          
          {/* Main Info Card */}
          <div className="card">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Column 1 - Project Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-[#3a3a3d] text-sm uppercase tracking-wide border-b border-[#e2e4e8] pb-2">
                  פרטי פרויקט
                </h3>
                
                {project.address && (
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-[#a7a7b0] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-[#a7a7b0]">כתובת</p>
                      <p className="font-medium text-[#3a3a3d]">{project.address}</p>
                    </div>
                  </div>
                )}
                
                {project.category && (
                  <div className="flex items-start gap-3">
                    <Tag size={18} className="text-[#a7a7b0] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-[#a7a7b0]">קטגוריה</p>
                      <span className="inline-block mt-1 px-3 py-1 bg-[#0a3161]/10 text-[#0a3161] rounded-full text-sm font-medium">
                        {project.category}
                      </span>
                    </div>
                  </div>
                )}
                
                {project.client && (
                  <div className="flex items-start gap-3">
                    <Briefcase size={18} className="text-[#a7a7b0] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-[#a7a7b0]">מזמין</p>
                      <p className="font-medium text-[#3a3a3d]">{project.client}</p>
                    </div>
                  </div>
                )}
                
                {project.startDate && (
                  <div className="flex items-start gap-3">
                    <Calendar size={18} className="text-[#a7a7b0] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-[#a7a7b0]">תאריך התחלה</p>
                      <p className="font-medium text-[#3a3a3d]">{formatDate(project.startDate)}</p>
                    </div>
                  </div>
                )}

                {(project.area || isSingleBuilding) && project.area && (
                  <div className="flex items-start gap-3">
                    <Ruler size={18} className="text-[#a7a7b0] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-[#a7a7b0]">שטח</p>
                      <p className="font-medium text-[#3a3a3d]">{project.area.toLocaleString()} מ"ר</p>
                    </div>
                  </div>
                )}

                {/* Estimated Cost - with calculation for multi/mega */}
                <div className="flex items-start gap-3">
                  <DollarSign size={18} className="text-[#a7a7b0] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[#a7a7b0]">עלות משוערת</p>
                    <p className="font-medium text-[#3a3a3d]">
                      {formatCurrency(getTotalEstimatedCost()) || 'לא הוגדר'}
                    </p>
                    {(isMegaProject || isMultiOrQuarter) && !project.estimatedCost && getTotalEstimatedCost() > 0 && (
                      <p className="text-xs text-[#8f8f96] mt-0.5">(מחושב מסכום {isMegaProject ? 'האזורים והמבנים' : 'המבנים'})</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Column 2 - Management Team */}
              <div className="space-y-4">
                <h3 className="font-semibold text-[#3a3a3d] text-sm uppercase tracking-wide border-b border-[#e2e4e8] pb-2">
                  צוות ניהול
                </h3>
                
                {project.lead ? (
                  <Link 
                    href={`/dashboard/hr/${project.lead.id}`} 
                    className="flex items-center gap-3 p-3 bg-[#0a3161]/5 rounded-xl hover:bg-[#0a3161]/10 transition-colors"
                  >
                    <div className="w-12 h-12 bg-[#0a3161] rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {project.lead.firstName[0]}{project.lead.lastName[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-[#3a3a3d]">{project.lead.firstName} {project.lead.lastName}</p>
                      <p className="text-xs text-[#0a3161] font-medium">מוביל/ת פרויקט</p>
                    </div>
                  </Link>
                ) : (
                  <p className="text-[#a7a7b0] text-sm p-3 bg-[#f5f6f8] rounded-xl">לא הוקצה מוביל/ת</p>
                )}

                {project.managers?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-[#8f8f96] font-medium">מנהלים נוספים:</p>
                    {project.managers.map((m: any) => (
                      <Link 
                        key={m.id} 
                        href={`/dashboard/hr/${m.employee.id}`} 
                        className="flex items-center gap-2 p-2 bg-[#f5f6f8] rounded-lg hover:bg-[#ebedf0] transition-colors"
                      >
                        <div className="w-8 h-8 bg-[#8f8f96] rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {m.employee.firstName[0]}{m.employee.lastName[0]}
                        </div>
                        <span className="text-sm font-medium text-[#3a3a3d]">
                          {m.employee.firstName} {m.employee.lastName}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 3 - Services & Building Types */}
              <div className="space-y-4">
                {project.services?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-[#3a3a3d] text-sm uppercase tracking-wide border-b border-[#e2e4e8] pb-2 mb-3">
                      שירותים
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {project.services.map((s: string, i: number) => (
                        <span key={i} className="text-xs bg-[#0a3161]/10 text-[#0a3161] px-2.5 py-1 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {project.buildingTypes?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-[#3a3a3d] text-sm uppercase tracking-wide border-b border-[#e2e4e8] pb-2 mb-3">
                      סוגי מבנים
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {project.buildingTypes.map((t: string, i: number) => (
                        <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {project.deliveryMethods?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-[#3a3a3d] text-sm uppercase tracking-wide border-b border-[#e2e4e8] pb-2 mb-3">
                      שיטת ביצוע
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {project.deliveryMethods.map((d: string, i: number) => (
                        <span key={i} className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {project.description && (
              <div className="mt-6 pt-6 border-t border-[#e2e4e8]">
                <h3 className="font-semibold text-[#3a3a3d] text-sm uppercase tracking-wide mb-3">תיאור</h3>
                <p className="text-[#3a3a3d] leading-relaxed bg-[#f5f6f8] rounded-xl p-4">
                  {project.description}
                </p>
              </div>
            )}
          </div>

          {/* ==========================================
              Mega Project - Quarters View
              ========================================== */}
          {isMegaProject && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#3a3a3d]">
                  אזורים/רבעים ומבנים
                  <span className="text-[#a7a7b0] font-normal mr-2 text-base">({quarters.length})</span>
                </h2>
              </div>
              
              {quarters.length === 0 ? (
                <div className="text-center py-12 bg-[#f5f6f8] rounded-2xl border-2 border-dashed border-[#e2e4e8]">
                  <Layers size={48} className="mx-auto mb-4 text-[#a7a7b0]" />
                  <p className="text-[#8f8f96]">אין אזורים - לחץ "הוסף אזור/רובע" להתחיל</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quarters.map((quarter: any) => {
                    const quarterCost = quarter.estimatedCost || 
                      quarter.children?.reduce((sum: number, b: any) => sum + (b.estimatedCost || 0), 0) || 0
                    
                    return (
                      <div key={quarter.id} className="bg-[#0a3161]/5 rounded-xl border-2 border-[#0a3161]/20 overflow-hidden hover:shadow-lg transition-shadow">
                        <Link href={`/dashboard/projects/${quarter.id}`}>
                          <div className="p-4 hover:bg-[#0a3161]/10 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <MapPin size={20} className="text-[#0a3161]" />
                                <span className="font-mono font-bold text-[#0a3161]" dir="ltr">#{quarter.projectNumber}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStateClass(quarter.state)}`}>
                                {quarter.state}
                              </span>
                            </div>
                            <h3 className="font-bold text-lg text-[#3a3a3d]">{quarter.name}</h3>
                            {quarter.lead && (
                              <p className="text-sm text-[#8f8f96] mt-1">מוביל: {quarter.lead.firstName} {quarter.lead.lastName}</p>
                            )}
                            {quarterCost > 0 && (
                              <p className="text-sm text-[#0a3161] mt-1 font-medium">{formatCurrency(quarterCost)}</p>
                            )}
                          </div>
                        </Link>
                        
                        {/* Buildings in Quarter */}
                        <div className="p-3 bg-white border-t border-[#0a3161]/20">
                          <p className="text-xs text-[#8f8f96] font-medium mb-2">מבנים ({quarter.children?.length || 0})</p>
                          {quarter.children?.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                              {quarter.children.map((building: any) => (
                                <Link key={building.id} href={`/dashboard/projects/${building.id}`}>
                                  <div className="p-3 bg-[#f5f6f8] rounded-lg border border-[#e2e4e8] hover:border-[#0a3161]/30 hover:shadow transition-all">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        <Building2 size={16} className="text-[#0a3161]" />
                                        <span className="font-mono text-sm font-semibold text-[#0a3161]" dir="ltr">#{building.projectNumber}</span>
                                      </div>
                                      <span className={`px-1.5 py-0.5 rounded text-xs ${getStateClass(building.state)}`}>
                                        {building.state}
                                      </span>
                                    </div>
                                    <p className="font-medium text-[#3a3a3d]">{building.name}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-[#8f8f96]">
                                      {building.lead && <span>מוביל: {building.lead.firstName} {building.lead.lastName}</span>}
                                      {building.area && <span>{building.area.toLocaleString()} מ"ר</span>}
                                      {building.estimatedCost && <span>{formatCurrency(building.estimatedCost)}</span>}
                                    </div>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-[#a7a7b0] text-center py-2">אין מבנים באזור</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              Multi/Quarter - Buildings View
              ========================================== */}
          {isMultiOrQuarter && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#3a3a3d]">
                  מבנים
                  <span className="text-[#a7a7b0] font-normal mr-2 text-base">({buildings.length})</span>
                </h2>
              </div>
              
              {buildings.length === 0 ? (
                <div className="text-center py-12 bg-[#f5f6f8] rounded-2xl border-2 border-dashed border-[#e2e4e8]">
                  <Building2 size={48} className="mx-auto mb-4 text-[#a7a7b0]" />
                  <p className="text-[#8f8f96]">אין מבנים - לחץ "הוסף מבנה" להתחיל</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {buildings.map((building: any) => (
                    <Link key={building.id} href={`/dashboard/projects/${building.id}`}>
                      <div className="card h-full hover:border-[#0a3161]/30 hover:shadow-lg transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Building2 size={20} className="text-[#0a3161]" />
                            <span className="font-mono font-bold text-[#0a3161]" dir="ltr">#{building.projectNumber}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStateClass(building.state)}`}>
                            {building.state}
                          </span>
                        </div>
                        <h3 className="font-bold text-[#3a3a3d] mb-2">{building.name}</h3>
                        {building.lead && (
                          <p className="text-sm text-[#8f8f96]">מוביל: {building.lead.firstName} {building.lead.lastName}</p>
                        )}
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#e2e4e8] text-xs text-[#8f8f96]">
                          {building.area && <span>{building.area.toLocaleString()} מ"ר</span>}
                          {building.estimatedCost && <span>{formatCurrency(building.estimatedCost)}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          Events Tab
          ========================================== */}
      {activeTab === 'events' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#3a3a3d]">אירועים</h2>
          </div>
          
          {loadingEvents ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a3161]"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays size={48} className="mx-auto mb-4 text-[#a7a7b0]" />
              <p className="text-[#8f8f96]">אין אירועים</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const ep = event.project
                const getFullName = () => {
                  if (!ep) return null
                  if (ep.parent?.parent) return `${ep.parent.parent.name} / ${ep.parent.name} / ${ep.name}`
                  if (ep.parent) return `${ep.parent.name} / ${ep.name}`
                  return ep.name
                }
                const showInfo = ep && ep.id !== id
                
                return (
                  <div key={event.id} className="p-4 border border-[#e2e4e8] rounded-xl hover:bg-[#f5f6f8] transition-colors">
                    {showInfo && (
                      <div className="mb-2 pb-2 border-b border-[#e2e4e8]">
                        <Link href={`/dashboard/projects/${ep.id}`} className="hover:underline">
                          <span className="font-mono text-sm text-[#0a3161] font-semibold" dir="ltr">#{ep.projectNumber}</span>
                          <span className="text-[#8f8f96] mr-2">{getFullName()}</span>
                        </Link>
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${EVENT_TYPE_COLORS[event.eventType] || 'event-other'}`}>
                          {event.eventType}
                        </span>
                        <div>
                          <p className="text-[#3a3a3d]">{event.description}</p>
                          <p className="text-sm text-[#8f8f96] mt-1">{formatDate(event.eventDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.files?.length > 0 && (
                          <span className="text-sm text-[#8f8f96] bg-[#f5f6f8] px-2 py-1 rounded">{event.files.length} קבצים</span>
                        )}
                        <Link
                          href={`/dashboard/events/${event.id}`}
                          className="p-2 text-[#8f8f96] hover:text-[#0a3161] hover:bg-[#f5f6f8] rounded-lg transition-colors"
                          title="עריכה"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-2 text-[#8f8f96] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="מחיקה"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          Contacts Tab
          ========================================== */}
      {activeTab === 'contacts' && (
        <ProjectContactsTab projectId={project.id} projectName={project.name} projectNumber={project.projectNumber} projectLevel={project.level} />
      )}

      {/* ==========================================
          Delete Confirmation Modal
          ========================================== */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle size={28} />
              <h3 className="text-xl font-bold">אישור מחיקה</h3>
            </div>
            <p className="text-[#3a3a3d] mb-6">
              האם אתה בטוח שברצונך למחוק את <strong>"{project.name}"</strong>?
              {(quarters.length > 0 || buildings.length > 0) && (
                <span className="block mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  ⚠️ לא ניתן למחוק - יש {quarters.length > 0 ? `${quarters.length} אזורים` : `${buildings.length} מבנים`} שיש למחוק קודם.
                </span>
              )}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary" disabled={deleting}>
                ביטול
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger"
                disabled={deleting || quarters.length > 0 || buildings.length > 0}
              >
                {deleting ? 'מוחק...' : 'מחק'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

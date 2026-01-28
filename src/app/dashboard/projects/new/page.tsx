'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowRight, Save, Building2, Layers, MapPin, Plus, Trash2, 
  ChevronDown, ChevronLeft, Check, Edit2, X
} from 'lucide-react'
import TagSelector, { GroupedTagSelector } from '@/components/TagSelector'

// ==========================================
// Types
// ==========================================

interface BuildingData {
  id: string
  name: string
  address: string
  area: string
  estimatedCost: string
  leadId: string
  managerIds: string[]
  services: string[]
  buildingTypes: string[]
  deliveryMethods: string[]
  description: string
}

interface QuarterData {
  id: string
  name: string
  address: string
  estimatedCost: string
  estimatedCostOverride: boolean
  leadId: string
  managerIds: string[]
  buildings: BuildingData[]
}

interface ParentProject {
  id: string
  name: string
  projectNumber: string
  address: string
  level: string
  projectType: string
  services: string[]
}

interface Domain {
  id: string
  name: string
  displayName: string
}

// ==========================================
// Constants
// ==========================================

const CATEGORIES = ['בטחוני', 'מסחרי', 'תעשייתי', 'מגורים', 'תשתיות', 'ציבורי']
const PHASES = ['ייזום', 'תכנון מוקדם', 'תכנון מפורט', 'מכרז', 'ביצוע', 'מסירה', 'שנת בדק']
const STATES = ['פעיל', 'מושהה', 'הושלם', 'בוטל']

const SERVICES = [
  'ייצוג בעלי עניין',
  'מסמכי דרישות, אפיון ופרוגרמה',
  'ניהול ביצוע ופיקוח',
  'ניהול הידע בפרויקט',
  'ניהול הצעה והגשה למכרז',
  'ניהול והבטחת איכות',
  'ניהול תב"ע והיתרים',
  'ניהול תכנון',
  'שירותי PMO',
  'תכנון כוללני',
]

const BUILDING_TYPES_GROUPED: Record<string, string[]> = {
  'מגורים ואירוח': ['מגורים רבי קומות', 'מגורים צמודי קרקע', 'מבני מעונות', 'מלונית/מלון', 'בתי אבות/דיור מוגן'],
  'משרדים, הייטק ותעשייה': ['משרדים', 'מרכז פיתוח והייטק', 'מעבדות', 'חדרי נתונים/חוות שרתים', 'מבני תעשייה', 'מפעל/מבנה ייצור'],
  'מסחר, בילוי ופנאי': ['מרכז מסחרי', 'אולם קולנוע', 'אולם תיאטרון', 'מוזיאון/גלריה', 'מרכזי ספורט ואצטדיונים', 'מסעדות ומתחמי אוכל'],
  'בריאות, חינוך ורווחה': ['מרכז רפואי', 'בית ספר / מבני חינוך', 'מרכזי מחקר רפואי', 'מבני ציבור ורווחה'],
  'תשתיות, אנרגיה ותחבורה': ['מתקני התפלה', 'תחנת כח', 'מתקני אנרגיה', 'גשרים', 'כבישים', 'נמל ימי', 'שדות תעופה', 'תחנות רכבת'],
  'לוגיסטיקה, אחסון וחנייה': ['מרכז לוגיסטי', 'מחסנים ממוכנים', 'חניון עילי', 'חניון תת קרקעי', 'חניון חנה וסע', 'תחנות דלק'],
  'מבנים ממשלתיים וביטחוניים': ['מבנה ממשלתי/ציבורי', 'בסיס צבאי/קמפוס ביטחוני', 'מבני מיגון ייעודיים'],
}

const DELIVERY_METHODS = ['תכנון ביצוע (Design Build)', 'DBOT', 'PPP', 'ביצוע']

const generateId = () => Math.random().toString(36).substr(2, 9)

const createEmptyBuilding = (inheritedAddress: string = '', inheritedServices: string[] = []): BuildingData => ({
  id: generateId(),
  name: '',
  address: inheritedAddress,
  area: '',
  estimatedCost: '',
  leadId: '',
  managerIds: [],
  services: [...inheritedServices],
  buildingTypes: [],
  deliveryMethods: [],
  description: '',
})

const createEmptyQuarter = (inheritedAddress: string = ''): QuarterData => ({
  id: generateId(),
  name: '',
  address: inheritedAddress,
  estimatedCost: '',
  estimatedCostOverride: false,
  leadId: '',
  managerIds: [],
  buildings: [],
})

// ==========================================
// Main Component
// ==========================================

export default function NewProjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Check if we're adding to existing project
  const parentId = searchParams?.get('parentId')
  const addType = searchParams?.get('type') // 'building' or 'quarter'
  
  const [employees, setEmployees] = useState<any[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Parent project data (when adding to existing)
  const [parentProject, setParentProject] = useState<ParentProject | null>(null)
  const [loadingParent, setLoadingParent] = useState(false)

  // Wizard state
  const [step, setStep] = useState<'type' | 'details' | 'structure'>('type')
  const [projectType, setProjectType] = useState<'single' | 'multi' | 'mega' | ''>('')

  // Project data
  const [form, setForm] = useState({
    name: '',
    address: '',
    domainId: '',
    category: [] as string[],  // B04: Changed to multi-select array
    client: '',
    phase: '',
    state: 'פעיל',
    startDate: '',
    description: '',
    leadId: '',
    managerIds: [] as string[],
    // For single project only
    area: '',
    estimatedCost: '',
    services: [] as string[],
    buildingTypes: [] as string[],
    deliveryMethods: [] as string[],
  })

  // New building form (when adding to existing project)
  const [newBuilding, setNewBuilding] = useState<BuildingData>(createEmptyBuilding())
  
  // New quarter form (when adding to existing mega project)
  const [newQuarter, setNewQuarter] = useState<QuarterData>(createEmptyQuarter())

  // Multi-building: direct buildings under project
  const [buildings, setBuildings] = useState<BuildingData[]>([])
  
  // Mega: quarters with buildings
  const [quarters, setQuarters] = useState<QuarterData[]>([])

  // UI state for editing
  const [selectedItem, setSelectedItem] = useState<{type: 'quarter' | 'building', quarterId?: string, buildingId?: string} | null>(null)
  const [expandedQuarters, setExpandedQuarters] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchEmployees()
    fetchDomains()
  }, [])

  // Fetch parent project when adding to existing
  useEffect(() => {
    if (parentId && addType) {
      fetchParentProject()
    }
  }, [parentId, addType])

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/hr?status=פעיל')
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.items || (Array.isArray(data) ? data : []))
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/admin/domains')
      if (res.ok) {
        const data = await res.json()
        setDomains(data || [])
      }
    } catch (error) {
      console.error('Error fetching domains:', error)
    }
  }

  const fetchParentProject = async () => {
    if (!parentId) return
    setLoadingParent(true)
    try {
      const res = await fetch(`/api/projects/${parentId}`)
      if (res.ok) {
        const data = await res.json()
        setParentProject({
          id: data.id,
          name: data.name,
          projectNumber: data.projectNumber,
          address: data.address || '',
          level: data.level,
          projectType: data.projectType || 'multi',
          services: data.services || []
        })
        // Pre-fill new building with inherited data
        setNewBuilding(createEmptyBuilding(data.address || '', data.services || []))
        // Pre-fill new quarter with inherited data
        setNewQuarter(createEmptyQuarter(data.address || ''))
      } else {
        setError('לא ניתן לטעון את פרטי הפרויקט')
      }
    } catch (error) {
      console.error('Error fetching parent project:', error)
      setError('שגיאה בטעינת פרטי הפרויקט')
    } finally {
      setLoadingParent(false)
    }
  }

  // ==========================================
  // Submit new building to existing project
  // ==========================================

  const handleSubmitNewBuilding = async () => {
    if (!parentId || !newBuilding.name) {
      setError('שם המבנה הוא שדה חובה')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        parentId: parentId,
        name: newBuilding.name,
        level: 'building',
        address: newBuilding.address || null,
        area: newBuilding.area ? parseFloat(newBuilding.area) : null,
        estimatedCost: newBuilding.estimatedCost ? parseFloat(newBuilding.estimatedCost) : null,
        leadId: newBuilding.leadId || null,
        services: newBuilding.services,
        buildingTypes: newBuilding.buildingTypes,
        deliveryMethods: newBuilding.deliveryMethods,
        description: newBuilding.description || null,
        state: 'פעיל',
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        // Redirect back to parent project
        router.push(`/dashboard/projects/${parentId}`)
      } else {
        const data = await res.json()
        setError(data.error || 'שגיאה ביצירת המבנה')
      }
    } catch (error) {
      setError('שגיאה בשמירת המבנה')
    } finally {
      setSaving(false)
    }
  }

  // ==========================================
  // Submit new quarter to existing mega project
  // ==========================================

  const handleSubmitNewQuarter = async () => {
    if (!parentId || !newQuarter.name) {
      setError('שם האזור/רובע הוא שדה חובה')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        parentId: parentId,
        name: newQuarter.name,
        level: 'quarter',
        address: newQuarter.address || null,
        estimatedCost: newQuarter.estimatedCost ? parseFloat(newQuarter.estimatedCost) : null,
        leadId: newQuarter.leadId || null,
        state: 'פעיל',
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        // Redirect back to parent project
        router.push(`/dashboard/projects/${parentId}`)
      } else {
        const data = await res.json()
        setError(data.error || 'שגיאה ביצירת האזור')
      }
    } catch (error) {
      setError('שגיאה בשמירת האזור')
    } finally {
      setSaving(false)
    }
  }

  // ==========================================
  // Hierarchy Navigation Helpers
  // ==========================================

  const getLetterIndex = (index: number): string => {
    return String.fromCharCode(65 + index) // A, B, C...
  }

  const toggleQuarterExpanded = (quarterId: string) => {
    setExpandedQuarters(prev => {
      const next = new Set(prev)
      if (next.has(quarterId)) next.delete(quarterId)
      else next.add(quarterId)
      return next
    })
  }

  // ==========================================
  // Quarter & Building Management
  // ==========================================

  const addQuarter = () => {
    const newQuarter = createEmptyQuarter(form.address)
    setQuarters([...quarters, newQuarter])
    setExpandedQuarters(prev => new Set(prev).add(newQuarter.id))
    setSelectedItem({ type: 'quarter', quarterId: newQuarter.id })
  }

  const updateQuarter = (quarterId: string, updates: Partial<QuarterData>) => {
    setQuarters(quarters.map(q => q.id === quarterId ? { ...q, ...updates } : q))
  }

  const removeQuarter = (quarterId: string) => {
    setQuarters(quarters.filter(q => q.id !== quarterId))
    if (selectedItem?.quarterId === quarterId) setSelectedItem(null)
  }

  const addBuildingToQuarter = (quarterId: string) => {
    const quarter = quarters.find(q => q.id === quarterId)
    const newBldg = createEmptyBuilding(quarter?.address || form.address, form.services)
    setQuarters(quarters.map(q => 
      q.id === quarterId 
        ? { ...q, buildings: [...q.buildings, newBldg] }
        : q
    ))
    setSelectedItem({ type: 'building', quarterId, buildingId: newBldg.id })
    setTimeout(() => {
      document.querySelector('.overflow-y-auto.h-full')?.scrollTo({ top: 0, behavior: 'smooth' })
    }, 50)
  }

  const updateBuildingInQuarter = (quarterId: string, buildingId: string, updates: Partial<BuildingData>) => {
    setQuarters(quarters.map(q => 
      q.id === quarterId 
        ? { ...q, buildings: q.buildings.map(b => b.id === buildingId ? { ...b, ...updates } : b) }
        : q
    ))
  }

  const removeBuildingFromQuarter = (quarterId: string, buildingId: string) => {
    setQuarters(quarters.map(q => 
      q.id === quarterId 
        ? { ...q, buildings: q.buildings.filter(b => b.id !== buildingId) }
        : q
    ))
    if (selectedItem?.buildingId === buildingId) setSelectedItem(null)
  }

  // For multi-building (no quarters)
  const addBuilding = () => {
    const newBldg = createEmptyBuilding(form.address, form.services)
    setBuildings([...buildings, newBldg])
    setSelectedItem({ type: 'building', buildingId: newBldg.id })
    setTimeout(() => {
      document.querySelector('.overflow-y-auto.h-full')?.scrollTo({ top: 0, behavior: 'smooth' })
    }, 50)
  }

  const updateBuilding = (buildingId: string, updates: Partial<BuildingData>) => {
    setBuildings(buildings.map(b => b.id === buildingId ? { ...b, ...updates } : b))
  }

  const removeBuilding = (buildingId: string) => {
    setBuildings(buildings.filter(b => b.id !== buildingId))
    if (selectedItem?.buildingId === buildingId) setSelectedItem(null)
  }

  // ==========================================
  // Cost Calculations
  // ==========================================

  const getQuarterCalculatedCost = (quarter: QuarterData): number => {
    return quarter.buildings.reduce((sum, b) => sum + (parseFloat(b.estimatedCost) || 0), 0)
  }

  const getTotalEstimatedCost = (): number => {
    if (projectType === 'single') {
      return parseFloat(form.estimatedCost) || 0
    }
    if (projectType === 'multi') {
      return buildings.reduce((sum, b) => sum + (parseFloat(b.estimatedCost) || 0), 0)
    }
    if (projectType === 'mega') {
      return quarters.reduce((sum, q) => {
        if (q.estimatedCostOverride && q.estimatedCost) {
          return sum + parseFloat(q.estimatedCost)
        }
        return sum + getQuarterCalculatedCost(q)
      }, 0)
    }
    return 0
  }

  // ==========================================
  // Form Submission
  // ==========================================

  const handleSubmit = async () => {
    if (!form.name) {
      setError('שם הפרויקט הוא שדה חובה')
      return
    }
    if (!form.domainId) {
      setError('תחום הוא שדה חובה')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload: any = {
        name: form.name,
        address: form.address || null,
        domainId: form.domainId || null,
        category: form.category.length > 0 ? form.category.join(', ') : null,  // B04: Convert array to comma-separated string
        client: form.client || null,
        phase: form.phase || null,
        state: form.state || 'פעיל',
        startDate: form.startDate || null,
        description: form.description || null,
        leadId: form.leadId || null,
        managerIds: form.managerIds,
        projectType,
      }

      if (projectType === 'single') {
        payload.area = form.area ? parseFloat(form.area) : null
        payload.estimatedCost = form.estimatedCost ? parseFloat(form.estimatedCost) : null
        payload.services = form.services
        payload.buildingTypes = form.buildingTypes
        payload.deliveryMethods = form.deliveryMethods
      }

      if (projectType === 'multi') {
        payload.buildings = buildings.map(b => ({
          name: b.name,
          address: b.address || null,
          area: b.area ? parseFloat(b.area) : null,
          estimatedCost: b.estimatedCost ? parseFloat(b.estimatedCost) : null,
          leadId: b.leadId || null,
          managerIds: b.managerIds,
          services: b.services,
          buildingTypes: b.buildingTypes,
          deliveryMethods: b.deliveryMethods,
          description: b.description || null,
        }))
      }

      if (projectType === 'mega') {
        payload.quarters = quarters.map(q => ({
          name: q.name,
          address: q.address || null,
          estimatedCost: q.estimatedCostOverride && q.estimatedCost ? parseFloat(q.estimatedCost) : null,
          leadId: q.leadId || null,
          managerIds: q.managerIds,
          buildings: q.buildings.map(b => ({
            name: b.name,
            address: b.address || null,
            area: b.area ? parseFloat(b.area) : null,
            estimatedCost: b.estimatedCost ? parseFloat(b.estimatedCost) : null,
            leadId: b.leadId || null,
            managerIds: b.managerIds,
            services: b.services,
            buildingTypes: b.buildingTypes,
            deliveryMethods: b.deliveryMethods,
            description: b.description || null,
          }))
        }))
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/dashboard/projects/${data.id}`)
      } else {
        const data = await res.json()
        setError(data.error || 'שגיאה ביצירת הפרויקט')
      }
    } catch (error) {
      setError('שגיאה בשמירת הפרויקט')
    } finally {
      setSaving(false)
    }
  }

  // ==========================================
  // Render Functions
  // ==========================================

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)

  // ==========================================
  // ADD BUILDING TO EXISTING PROJECT
  // ==========================================

  if (parentId && addType === 'building') {
    if (loadingParent) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a3161]"></div>
          <span className="mr-3 text-[#8f8f96]">טוען פרטי פרויקט...</span>
        </div>
      )
    }

    if (!parentProject) {
      return (
        <div className="max-w-2xl mx-auto">
          <div className="card text-center py-12">
            <p className="text-red-600 mb-4">{error || 'לא ניתן לטעון את פרטי הפרויקט'}</p>
            <Link href="/dashboard/projects" className="btn btn-secondary">
              חזרה לרשימת הפרויקטים
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link 
            href={`/dashboard/projects/${parentId}`} 
            className="p-2 hover:bg-[#f5f6f8] rounded-lg transition-colors"
          >
            <ArrowRight size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#3a3a3d]">הוספת מבנה</h1>
            <p className="text-sm text-[#8f8f96]">
              לפרויקט: {parentProject.projectNumber} - {parentProject.name}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 text-[#3a3a3d]">פרטי מבנה</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">
                  שם המבנה <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newBuilding.name}
                  onChange={(e) => setNewBuilding({ ...newBuilding, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                  placeholder="למשל: מבנה מגורים 1"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">כתובת</label>
                <input
                  type="text"
                  value={newBuilding.address}
                  onChange={(e) => setNewBuilding({ ...newBuilding, address: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">שטח (מ"ר)</label>
                <input
                  type="number"
                  value={newBuilding.area}
                  onChange={(e) => setNewBuilding({ ...newBuilding, area: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">עלות משוערת (₪)</label>
                <input
                  type="number"
                  value={newBuilding.estimatedCost}
                  onChange={(e) => setNewBuilding({ ...newBuilding, estimatedCost: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">מוביל/ת מבנה</label>
                <select
                  value={newBuilding.leadId}
                  onChange={(e) => setNewBuilding({ ...newBuilding, leadId: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                >
                  <option value="">בחר מוביל/ת (אופציונלי)</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-2 text-[#3a3a3d]">שירותים</h2>
            <TagSelector
              options={SERVICES}
              selected={newBuilding.services}
              onChange={(services) => setNewBuilding({ ...newBuilding, services })}
              columns={2}
            />
          </div>

          {/* Building Types */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-2 text-[#3a3a3d]">סוגי מבנים</h2>
            <GroupedTagSelector
              groups={BUILDING_TYPES_GROUPED}
              selected={newBuilding.buildingTypes}
              onChange={(types) => setNewBuilding({ ...newBuilding, buildingTypes: types })}
            />
          </div>

          {/* Delivery Methods */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-2 text-[#3a3a3d]">שיטת ביצוע</h2>
            <TagSelector
              options={DELIVERY_METHODS}
              selected={newBuilding.deliveryMethods}
              onChange={(methods) => setNewBuilding({ ...newBuilding, deliveryMethods: methods })}
              columns={4}
            />
          </div>

          {/* Description */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 text-[#3a3a3d]">תיאור</h2>
            <textarea
              value={newBuilding.description}
              onChange={(e) => setNewBuilding({ ...newBuilding, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
              placeholder="תיאור המבנה (אופציונלי)"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link href={`/dashboard/projects/${parentId}`} className="btn btn-secondary">
              <ArrowRight size={18} /> ביטול
            </Link>
            <button 
              onClick={handleSubmitNewBuilding} 
              disabled={saving || !newBuilding.name} 
              className="btn btn-primary btn-lg"
            >
              <Save size={18} />
              {saving ? 'שומר...' : 'הוסף מבנה'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // ADD QUARTER TO EXISTING MEGA PROJECT
  // ==========================================

  if (parentId && addType === 'quarter') {
    if (loadingParent) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a3161]"></div>
          <span className="mr-3 text-[#8f8f96]">טוען פרטי פרויקט...</span>
        </div>
      )
    }

    if (!parentProject) {
      return (
        <div className="max-w-2xl mx-auto">
          <div className="card text-center py-12">
            <p className="text-red-600 mb-4">{error || 'לא ניתן לטעון את פרטי הפרויקט'}</p>
            <Link href="/dashboard/projects" className="btn btn-secondary">
              חזרה לרשימת הפרויקטים
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link 
            href={`/dashboard/projects/${parentId}`} 
            className="p-2 hover:bg-[#f5f6f8] rounded-lg transition-colors"
          >
            <ArrowRight size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#3a3a3d]">הוספת אזור/רובע</h1>
            <p className="text-sm text-[#8f8f96]">
              לפרויקט: {parentProject.projectNumber} - {parentProject.name}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 text-[#3a3a3d]">פרטי אזור/רובע</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">
                  שם האזור/רובע <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newQuarter.name}
                  onChange={(e) => setNewQuarter({ ...newQuarter, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                  placeholder="למשל: אזור צפון"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">כתובת</label>
                <input
                  type="text"
                  value={newQuarter.address}
                  onChange={(e) => setNewQuarter({ ...newQuarter, address: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">עלות משוערת (₪)</label>
                <input
                  type="number"
                  value={newQuarter.estimatedCost}
                  onChange={(e) => setNewQuarter({ ...newQuarter, estimatedCost: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">מוביל/ת</label>
                <select
                  value={newQuarter.leadId}
                  onChange={(e) => setNewQuarter({ ...newQuarter, leadId: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                >
                  <option value="">בחר מוביל/ת (אופציונלי)</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link href={`/dashboard/projects/${parentId}`} className="btn btn-secondary">
              <ArrowRight size={18} /> ביטול
            </Link>
            <button 
              onClick={handleSubmitNewQuarter} 
              disabled={saving || !newQuarter.name} 
              className="btn btn-primary btn-lg"
            >
              <Save size={18} />
              {saving ? 'שומר...' : 'הוסף אזור/רובע'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // Step 1: Project Type Selection
  // ==========================================

  if (step === 'type' && !parentId) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/projects" className="p-2 hover:bg-[#f5f6f8] rounded-lg transition-colors">
            <ArrowRight size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-[#3a3a3d]">פרויקט חדש</h1>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-6 text-[#3a3a3d]">בחר סוג פרויקט</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Single Building */}
            <button
              onClick={() => { setProjectType('single'); setStep('details') }}
              className={`p-6 rounded-xl border-2 text-right transition-all hover:shadow-lg ${
                projectType === 'single' 
                  ? 'border-[#0a3161] bg-[#0a3161]/5' 
                  : 'border-[#e2e4e8] hover:border-[#0a3161]/30'
              }`}
            >
              <Building2 size={40} className="text-[#0a3161] mb-4" />
              <h3 className="font-bold text-lg mb-2">פרויקט</h3>
              <p className="text-sm text-[#8f8f96]">מבנה בודד או פרויקט פשוט</p>
              <div className="mt-4 text-xs text-[#a7a7b0] font-mono" dir="ltr">4796</div>
            </button>

            {/* Multi Building */}
            <button
              onClick={() => { setProjectType('multi'); setStep('details') }}
              className={`p-6 rounded-xl border-2 text-right transition-all hover:shadow-lg ${
                projectType === 'multi' 
                  ? 'border-[#0a3161] bg-[#0a3161]/5' 
                  : 'border-[#e2e4e8] hover:border-[#0a3161]/30'
              }`}
            >
              <div className="flex gap-1 mb-4">
                <Building2 size={32} className="text-[#0a3161]" />
                <Building2 size={32} className="text-[#0a3161]" />
              </div>
              <h3 className="font-bold text-lg mb-2">מרובה מבנים</h3>
              <p className="text-sm text-[#8f8f96]">מספר מבנים באותו מתחם</p>
              <div className="mt-4 text-xs text-[#a7a7b0] font-mono" dir="ltr">4796-01, 4796-02</div>
            </button>

            {/* Mega Project */}
            <button
              onClick={() => { setProjectType('mega'); setStep('details') }}
              className={`p-6 rounded-xl border-2 text-right transition-all hover:shadow-lg ${
                projectType === 'mega' 
                  ? 'border-[#0a3161] bg-[#0a3161]/5' 
                  : 'border-[#e2e4e8] hover:border-[#0a3161]/30'
              }`}
            >
              <div className="flex gap-1 mb-4">
                <Layers size={40} className="text-[#0a3161]" />
              </div>
              <h3 className="font-bold text-lg mb-2">מגה פרויקט</h3>
              <p className="text-sm text-[#8f8f96]">אזורים/רבעים עם מבנים בכל אחד</p>
              <div className="mt-4 text-xs text-[#a7a7b0] font-mono" dir="ltr">4796-A-01, 4796-B-01</div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // Step 2: Project Details
  // ==========================================

  if (step === 'details') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setStep('type')} className="p-2 hover:bg-[#f5f6f8] rounded-lg transition-colors">
            <ArrowRight size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#3a3a3d]">פרטי הפרויקט</h1>
            <p className="text-sm text-[#8f8f96]">
              {projectType === 'single' && 'פרויקט'}
              {projectType === 'multi' && 'פרויקט מרובה מבנים'}
              {projectType === 'mega' && 'מגה פרויקט'}
            </p>
          </div>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 text-[#3a3a3d]">פרטים בסיסיים</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">
                  שם הפרויקט <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                  placeholder="למשל: קמפוס הייטק רמת החייל"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">כתובת</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">מזמין עבודה</label>
                <input
                  type="text"
                  value={form.client}
                  onChange={(e) => setForm({ ...form, client: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">תאריך התחלה</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                />
              </div>
            </div>
          </div>

          {/* Domain - Required */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-2 text-[#3a3a3d]">
              תחום <span className="text-red-500">*</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {domains.map((domain) => (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => setForm({ ...form, domainId: domain.id })}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.domainId === domain.id
                      ? 'bg-[#0a3161] text-white border-[#0a3161]'
                      : 'bg-white text-[#3a3a3d] border-[#e2e4e8] hover:border-[#0a3161] hover:bg-[#f5f6f8]'
                  }`}
                >
                  {domain.displayName}
                </button>
              ))}
            </div>
            {!form.domainId && (
              <p className="text-sm text-red-500 mt-2">יש לבחור תחום</p>
            )}
          </div>

          {/* Category - Multi-select */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-2 text-[#3a3a3d]">קטגוריה</h2>
            <TagSelector
              options={CATEGORIES}
              selected={form.category}
              onChange={(selected) => setForm({ ...form, category: selected })}
              multiple={true}
              columns={3}
            />
          </div>

          {/* Phase & State */}
          <div className="card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-semibold mb-2 text-[#3a3a3d]">שלב</h2>
                <TagSelector
                  options={PHASES}
                  selected={form.phase ? [form.phase] : []}
                  onChange={(selected) => setForm({ ...form, phase: selected[0] || '' })}
                  multiple={false}
                  columns={2}
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-2 text-[#3a3a3d]">מצב</h2>
                <TagSelector
                  options={STATES}
                  selected={form.state ? [form.state] : []}
                  onChange={(selected) => setForm({ ...form, state: selected[0] || 'פעיל' })}
                  multiple={false}
                  columns={2}
                />
              </div>
            </div>
          </div>

          {/* Lead */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 text-[#3a3a3d]">צוות ניהול</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#3a3a3d] mb-1">מוביל/ת פרויקט</label>
                <select
                  value={form.leadId}
                  onChange={(e) => setForm({ ...form, leadId: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                >
                  <option value="">בחר מוביל/ת</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Single project - show all fields here */}
          {projectType === 'single' && (
            <>
              <div className="card">
                <h2 className="text-lg font-semibold mb-4 text-[#3a3a3d]">נתונים כמותיים</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#3a3a3d] mb-1">שטח (מ"ר)</label>
                    <input
                      type="number"
                      value={form.area}
                      onChange={(e) => setForm({ ...form, area: e.target.value })}
                      className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3a3a3d] mb-1">עלות משוערת (₪)</label>
                    <input
                      type="number"
                      value={form.estimatedCost}
                      onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
                      className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold mb-2 text-[#3a3a3d]">שירותים</h2>
                <TagSelector
                  options={SERVICES}
                  selected={form.services}
                  onChange={(services) => setForm({ ...form, services })}
                  columns={2}
                />
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold mb-2 text-[#3a3a3d]">סוגי מבנים</h2>
                <GroupedTagSelector
                  groups={BUILDING_TYPES_GROUPED}
                  selected={form.buildingTypes}
                  onChange={(types) => setForm({ ...form, buildingTypes: types })}
                />
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold mb-2 text-[#3a3a3d]">שיטת ביצוע</h2>
                <TagSelector
                  options={DELIVERY_METHODS}
                  selected={form.deliveryMethods}
                  onChange={(methods) => setForm({ ...form, deliveryMethods: methods })}
                  columns={4}
                />
              </div>
            </>
          )}

          {/* Description */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 text-[#3a3a3d]">תיאור</h2>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
              placeholder="תיאור הפרויקט (אופציונלי)"
            />
          </div>

          {/* Services for multi/mega - inherited by buildings */}
          {(projectType === 'multi' || projectType === 'mega') && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-2 text-[#3a3a3d]">שירותים (ברירת מחדל למבנים)</h2>
              <p className="text-sm text-[#8f8f96] mb-4">שירותים אלו יורשו לכל המבנים - ניתן לשנות בכל מבנה בנפרד</p>
              <TagSelector
                options={SERVICES}
                selected={form.services}
                onChange={(services) => setForm({ ...form, services })}
                columns={2}
              />
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button onClick={() => setStep('type')} className="btn btn-secondary">
              <ArrowRight size={18} /> חזרה
            </button>
            
            {projectType === 'single' ? (
              <button onClick={handleSubmit} disabled={saving || !form.name} className="btn btn-primary btn-lg">
                <Save size={18} />
                {saving ? 'שומר...' : 'צור פרויקט'}
              </button>
            ) : (
              <button onClick={() => setStep('structure')} disabled={!form.name} className="btn btn-primary btn-lg">
                המשך להגדרת מבנים <ChevronLeft size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // Step 3: Structure (Multi/Mega)
  // ==========================================

  if (step === 'structure') {
    const isMega = projectType === 'mega'
    
    // Get selected item data for editing panel
    const getSelectedBuilding = (): BuildingData | null => {
      if (!selectedItem || selectedItem.type !== 'building') return null
      if (isMega && selectedItem.quarterId) {
        const quarter = quarters.find(q => q.id === selectedItem.quarterId)
        return quarter?.buildings.find(b => b.id === selectedItem.buildingId) || null
      }
      return buildings.find(b => b.id === selectedItem.buildingId) || null
    }

    const getSelectedQuarter = (): QuarterData | null => {
      if (!selectedItem || selectedItem.type !== 'quarter') return null
      return quarters.find(q => q.id === selectedItem.quarterId) || null
    }

    const selectedBuilding = getSelectedBuilding()
    const selectedQuarter = getSelectedQuarter()

    return (
      <div className="h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setStep('details')} className="p-2 hover:bg-[#f5f6f8] rounded-lg transition-colors">
              <ArrowRight size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#3a3a3d]">{form.name}</h1>
              <p className="text-sm text-[#8f8f96]">
                {isMega ? 'מגה פרויקט - הגדרת אזורים ומבנים' : 'הגדרת מבנים'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-left">
              <p className="text-xs text-[#8f8f96]">עלות כוללת משוערת</p>
              <p className="font-bold text-[#0a3161]">{formatCurrency(getTotalEstimatedCost())}</p>
            </div>
            <button onClick={handleSubmit} disabled={saving} className="btn btn-primary btn-lg">
              <Save size={18} />
              {saving ? 'שומר...' : 'צור פרויקט'}
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}

        <div className="flex gap-4 h-full">
          {/* Left Panel - Hierarchy Tree */}
          <div className="w-80 bg-white rounded-xl border border-[#e2e4e8] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#e2e4e8] bg-[#f5f6f8]">
              <h3 className="font-semibold text-[#3a3a3d]">מבנה הפרויקט</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {/* Project Root */}
              <div className="p-3 bg-[#0a3161]/10 rounded-lg mb-2">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-[#0a3161]" />
                  <span className="font-semibold text-[#0a3161]">{form.name || 'פרויקט חדש'}</span>
                </div>
              </div>

              {/* Mega Project - Quarters */}
              {isMega && (
                <div className="space-y-1">
                  {quarters.map((quarter, qIndex) => (
                    <div key={quarter.id}>
                      <div 
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedItem?.quarterId === quarter.id && selectedItem.type === 'quarter'
                            ? 'bg-[#0a3161] text-white'
                            : 'hover:bg-[#f5f6f8]'
                        }`}
                      >
                        <button 
                          onClick={() => toggleQuarterExpanded(quarter.id)}
                          className="p-1 hover:bg-black/10 rounded"
                        >
                          {expandedQuarters.has(quarter.id) ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
                        </button>
                        <MapPin size={16} />
                        <span 
                          className="flex-1 truncate"
                          onClick={() => setSelectedItem({ type: 'quarter', quarterId: quarter.id })}
                        >
                          {quarter.name || `אזור/רובע ${getLetterIndex(qIndex)}`}
                        </span>
                        <button 
                          onClick={() => removeQuarter(quarter.id)}
                          className="p-1 hover:bg-red-100 rounded text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {expandedQuarters.has(quarter.id) && (
                        <div className="mr-6 space-y-1 mt-1">
                          {quarter.buildings.map((building, bIndex) => (
                            <div
                              key={building.id}
                              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                selectedItem?.buildingId === building.id
                                  ? 'bg-[#0a3161] text-white'
                                  : 'hover:bg-[#f5f6f8]'
                              }`}
                              onClick={() => {
                                setSelectedItem({ type: 'building', quarterId: quarter.id, buildingId: building.id })
                                setTimeout(() => {
                                  document.querySelector('.overflow-y-auto.h-full')?.scrollTo({ top: 0, behavior: 'smooth' })
                                }, 50)
                              }}
                            >
                              <Building2 size={14} />
                              <span className="flex-1 truncate">
                                {building.name || `מבנה ${String(bIndex + 1).padStart(2, '0')}`}
                              </span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeBuildingFromQuarter(quarter.id, building.id) }}
                                className="p-1 hover:bg-red-100 rounded text-red-500"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addBuildingToQuarter(quarter.id)}
                            className="flex items-center gap-2 p-2 text-[#0a3161] hover:bg-[#0a3161]/10 rounded-lg w-full text-sm"
                          >
                            <Plus size={14} /> הוסף מבנה
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <button
                    onClick={addQuarter}
                    className="flex items-center gap-2 p-3 text-[#0a3161] hover:bg-[#0a3161]/10 rounded-lg w-full font-medium"
                  >
                    <Plus size={18} /> הוסף אזור/רובע
                  </button>
                </div>
              )}

              {/* Multi Building - Direct Buildings */}
              {!isMega && (
                <div className="space-y-1">
                  {buildings.map((building, index) => (
                    <div
                      key={building.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedItem?.buildingId === building.id
                          ? 'bg-[#0a3161] text-white'
                          : 'hover:bg-[#f5f6f8]'
                      }`}
                      onClick={() => {
                        setSelectedItem({ type: 'building', buildingId: building.id })
                        setTimeout(() => {
                          document.querySelector('.overflow-y-auto.h-full')?.scrollTo({ top: 0, behavior: 'smooth' })
                        }, 50)
                      }}
                    >
                      <Building2 size={16} />
                      <span className="flex-1 truncate">
                        {building.name || `מבנה ${String(index + 1).padStart(2, '0')}`}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeBuilding(building.id) }}
                        className="p-1 hover:bg-red-100 rounded text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={addBuilding}
                    className="flex items-center gap-2 p-3 text-[#0a3161] hover:bg-[#0a3161]/10 rounded-lg w-full font-medium"
                  >
                    <Plus size={18} /> הוסף מבנה
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#e2e4e8] bg-[#f5f6f8]">
              {isMega ? (
                <p className="text-sm text-[#8f8f96]">
                  {quarters.length} אזורים, {quarters.reduce((sum, q) => sum + q.buildings.length, 0)} מבנים
                </p>
              ) : (
                <p className="text-sm text-[#8f8f96]">{buildings.length} מבנים</p>
              )}
            </div>
          </div>

          {/* Right Panel - Edit Form */}
          <div className="flex-1 bg-white rounded-xl border border-[#e2e4e8] overflow-hidden">
            {!selectedItem ? (
              <div className="flex items-center justify-center h-full text-[#a7a7b0]">
                <div className="text-center">
                  <Edit2 size={48} className="mx-auto mb-4 opacity-50" />
                  <p>בחר {isMega ? 'אזור/רובע או מבנה' : 'מבנה'} מהעץ לעריכה</p>
                  <p className="text-sm mt-2">או לחץ על "הוסף" להוספת {isMega ? 'אזור חדש' : 'מבנה חדש'}</p>
                </div>
              </div>
            ) : selectedItem.type === 'quarter' && selectedQuarter ? (
              <div className="p-6 overflow-y-auto h-full">
                <h3 className="text-lg font-semibold mb-4 text-[#3a3a3d]">פרטי אזור/רובע</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#3a3a3d] mb-1">שם האזור/רובע</label>
                    <input
                      type="text"
                      value={selectedQuarter.name}
                      onChange={(e) => updateQuarter(selectedQuarter.id, { name: e.target.value })}
                      className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                      placeholder="למשל: אזור צפון"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3a3a3d] mb-1">כתובת</label>
                    <input
                      type="text"
                      value={selectedQuarter.address}
                      onChange={(e) => updateQuarter(selectedQuarter.id, { address: e.target.value })}
                      className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3a3a3d] mb-1">מוביל/ת</label>
                    <select
                      value={selectedQuarter.leadId}
                      onChange={(e) => updateQuarter(selectedQuarter.id, { leadId: e.target.value })}
                      className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                    >
                      <option value="">בחר מוביל/ת (אופציונלי)</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3a3a3d] mb-1">עלות משוערת</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={selectedQuarter.estimatedCostOverride ? selectedQuarter.estimatedCost : ''}
                        onChange={(e) => updateQuarter(selectedQuarter.id, { 
                          estimatedCost: e.target.value,
                          estimatedCostOverride: true 
                        })}
                        placeholder={`מחושב: ${formatCurrency(getQuarterCalculatedCost(selectedQuarter))}`}
                        className="flex-1 px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                      />
                      {selectedQuarter.estimatedCostOverride && (
                        <button
                          onClick={() => updateQuarter(selectedQuarter.id, { estimatedCost: '', estimatedCostOverride: false })}
                          className="p-2 text-[#8f8f96] hover:text-red-500"
                          title="חזור לחישוב אוטומטי"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[#8f8f96] mt-1">
                      {selectedQuarter.estimatedCostOverride 
                        ? 'ערך ידני - לחץ X לחישוב אוטומטי'
                        : 'מחושב אוטומטית מסכום המבנים'}
                    </p>
                  </div>
                </div>
              </div>
            ) : selectedItem.type === 'building' && selectedBuilding ? (
              <div className="p-6 overflow-y-auto h-full">
                <h3 className="text-lg font-semibold mb-4 text-[#3a3a3d]">פרטי מבנה</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#3a3a3d] mb-1">שם המבנה</label>
                      <input
                        type="text"
                        value={selectedBuilding.name}
                        onChange={(e) => {
                          if (isMega && selectedItem.quarterId) {
                            updateBuildingInQuarter(selectedItem.quarterId, selectedBuilding.id, { name: e.target.value })
                          } else {
                            updateBuilding(selectedBuilding.id, { name: e.target.value })
                          }
                        }}
                        className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                        placeholder="למשל: בניין A"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#3a3a3d] mb-1">כתובת</label>
                      <input
                        type="text"
                        value={selectedBuilding.address}
                        onChange={(e) => {
                          if (isMega && selectedItem.quarterId) {
                            updateBuildingInQuarter(selectedItem.quarterId, selectedBuilding.id, { address: e.target.value })
                          } else {
                            updateBuilding(selectedBuilding.id, { address: e.target.value })
                          }
                        }}
                        className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#3a3a3d] mb-1">שטח (מ"ר)</label>
                      <input
                        type="number"
                        value={selectedBuilding.area}
                        onChange={(e) => {
                          if (isMega && selectedItem.quarterId) {
                            updateBuildingInQuarter(selectedItem.quarterId, selectedBuilding.id, { area: e.target.value })
                          } else {
                            updateBuilding(selectedBuilding.id, { area: e.target.value })
                          }
                        }}
                        className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#3a3a3d] mb-1">עלות משוערת (₪)</label>
                      <input
                        type="number"
                        value={selectedBuilding.estimatedCost}
                        onChange={(e) => {
                          if (isMega && selectedItem.quarterId) {
                            updateBuildingInQuarter(selectedItem.quarterId, selectedBuilding.id, { estimatedCost: e.target.value })
                          } else {
                            updateBuilding(selectedBuilding.id, { estimatedCost: e.target.value })
                          }
                        }}
                        className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#3a3a3d] mb-1">מוביל/ת מבנה</label>
                    <select
                      value={selectedBuilding.leadId}
                      onChange={(e) => {
                        if (isMega && selectedItem.quarterId) {
                          updateBuildingInQuarter(selectedItem.quarterId, selectedBuilding.id, { leadId: e.target.value })
                        } else {
                          updateBuilding(selectedBuilding.id, { leadId: e.target.value })
                        }
                      }}
                      className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                    >
                      <option value="">בחר מוביל/ת (אופציונלי)</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-[#3a3a3d]">שירותים</h4>
                    <TagSelector
                      options={SERVICES}
                      selected={selectedBuilding.services}
                      onChange={(services) => {
                        if (isMega && selectedItem.quarterId) {
                          updateBuildingInQuarter(selectedItem.quarterId, selectedBuilding.id, { services })
                        } else {
                          updateBuilding(selectedBuilding.id, { services })
                        }
                      }}
                      columns={2}
                    />
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-[#3a3a3d]">סוגי מבנים</h4>
                    <GroupedTagSelector
                      groups={BUILDING_TYPES_GROUPED}
                      selected={selectedBuilding.buildingTypes}
                      onChange={(types) => {
                        if (isMega && selectedItem.quarterId) {
                          updateBuildingInQuarter(selectedItem.quarterId, selectedBuilding.id, { buildingTypes: types })
                        } else {
                          updateBuilding(selectedBuilding.id, { buildingTypes: types })
                        }
                      }}
                    />
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-[#3a3a3d]">שיטת ביצוע</h4>
                    <TagSelector
                      options={DELIVERY_METHODS}
                      selected={selectedBuilding.deliveryMethods}
                      onChange={(methods) => {
                        if (isMega && selectedItem.quarterId) {
                          updateBuildingInQuarter(selectedItem.quarterId, selectedBuilding.id, { deliveryMethods: methods })
                        } else {
                          updateBuilding(selectedBuilding.id, { deliveryMethods: methods })
                        }
                      }}
                      columns={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#3a3a3d] mb-1">תיאור</label>
                    <textarea
                      value={selectedBuilding.description}
                      onChange={(e) => {
                        if (isMega && selectedItem.quarterId) {
                          updateBuildingInQuarter(selectedItem.quarterId, selectedBuilding.id, { description: e.target.value })
                        } else {
                          updateBuilding(selectedBuilding.id, { description: e.target.value })
                        }
                      }}
                      rows={3}
                      className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return null
}
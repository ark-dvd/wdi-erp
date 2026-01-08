'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Save } from 'lucide-react'
import TagSelector, { GroupedTagSelector } from '@/components/TagSelector'

// ==========================================
// Constants
// ==========================================

const CATEGORIES = ['בטחוני', 'מסחרי', 'תעשייתי', 'מגורים', 'תשתיות', 'ציבורי']
const PHASES = ['ייזום', 'תכנון מוקדם', 'תכנון מפורט', 'מכרז', 'ביצוע', 'מסירה', 'שנת בדק']
const STATES = ['פעיל', 'מושהה', 'הושלם', 'בוטל']

const SERVICES = [
  'ניהול תכנון',
  'מסמכי דרישות, אפיון ופרוגרמה',
  'ייצוג בעלי עניין',
  'ניהול ביצוע ופיקוח',
  'ניהול והבטחת איכות',
  'שירותי PMO',
  'ניהול תב"ע והיתרים',
  'ניהול הידע בפרויקט',
  'ניהול הצעה והגשה למכרז',
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

// ==========================================
// Main Component
// ==========================================

export default function EditProjectPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [employees, setEmployees] = useState<any[]>([])
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    address: '',
    category: '',
    client: '',
    phase: '',
    state: '',
    area: '',
    estimatedCost: '',
    startDate: '',
    description: '',
    leadId: '',
    managerIds: [] as string[],
    services: [] as string[],
    buildingTypes: [] as string[],
    deliveryMethods: [] as string[],
  })

  useEffect(() => {
    fetchProject()
    fetchEmployees()
  }, [id])

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`)
      if (res.ok) {
        const data = await res.json()
        setProject(data)
        setForm({
          name: data.name || '',
          address: data.address || '',
          category: data.category || '',
          client: data.client || '',
          phase: data.phase || '',
          state: data.state || '',
          area: data.area?.toString() || '',
          estimatedCost: data.estimatedCost?.toString() || '',
          startDate: data.startDate ? data.startDate.split('T')[0] : '',
          description: data.description || '',
          leadId: data.leadId || '',
          managerIds: data.managers?.map((m: any) => m.employee.id) || [],
          services: data.services || [],
          buildingTypes: data.buildingTypes || [],
          deliveryMethods: data.deliveryMethods || [],
        })
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/hr?status=פעיל')
      if (res.ok) {
        const data = await res.json()
        setEmployees(Array.isArray(data) ? data : data.employees || [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const toggleArrayItem = (arr: string[], item: string): string[] => {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          area: form.area ? parseFloat(form.area) : null,
          estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : null,
          startDate: form.startDate || null,
        }),
      })

      if (res.ok) {
        router.push(`/dashboard/projects/${id}`)
      } else {
        const data = await res.json()
        setError(data.error || 'שגיאה בעדכון הפרויקט')
      }
    } catch (error) {
      setError('שגיאה בשמירת הפרויקט')
    } finally {
      setSaving(false)
    }
  }

  // ==========================================
  // Sub-Components
  // ==========================================

  const ManagersMultiSelect = ({ 
    selected, 
    onChange, 
    excludeId,
    label = 'מנהלי פרויקט נוספים'
  }: { 
    selected: string[], 
    onChange: (ids: string[]) => void,
    excludeId?: string,
    label?: string
  }) => {
    const availableEmployees = employees.filter(e => e.id !== excludeId)
    
    return (
      <div>
        <label className="block text-sm font-medium text-[#3a3a3d] mb-2">{label}</label>
        <div className="border border-[#e2e4e8] rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
          {availableEmployees.length === 0 ? (
            <p className="text-sm text-[#a7a7b0] text-center py-2">אין עובדים זמינים</p>
          ) : (
            <div className="space-y-1">
              {availableEmployees.map((emp) => (
                <label key={emp.id} className="flex items-center gap-2 p-2 hover:bg-[#f5f6f8] rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(emp.id)}
                    onChange={() => onChange(toggleArrayItem(selected, emp.id))}
                    className="w-4 h-4 text-[#0a3161] rounded border-[#e2e4e8] focus:ring-[#0a3161]"
                  />
                  <span className="text-sm">{emp.firstName} {emp.lastName}</span>
                  {emp.role && <span className="text-xs text-[#a7a7b0]">({emp.role})</span>}
                </label>
              ))}
            </div>
          )}
        </div>
        {selected.length > 0 && (
          <p className="text-xs text-[#8f8f96] mt-1">נבחרו: {selected.length}</p>
        )}
      </div>
    )
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
  // Determine if this is a building/single (show all fields) or multi/mega parent
  // ==========================================

  const showAllFields = project.level === 'building' || 
    (project.level === 'project' && project.projectType === 'single') ||
    project.level === 'quarter'

  // ==========================================
  // Render
  // ==========================================

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/projects/${id}`} className="p-2 hover:bg-[#f5f6f8] rounded-lg transition-colors">
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#3a3a3d]">עריכת פרויקט</h1>
          <p className="text-[#8f8f96]">{project.projectNumber} - {project.name}</p>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* ==========================================
            Basic Details
            ========================================== */}
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

        {/* ==========================================
            Category Tags
            ========================================== */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-2 text-[#3a3a3d]">קטגוריה</h2>
          <p className="text-sm text-[#8f8f96] mb-4">בחר קטגוריה אחת</p>
          <TagSelector
            options={CATEGORIES}
            selected={form.category ? [form.category] : []}
            onChange={(selected) => setForm({ ...form, category: selected[0] || '' })}
            multiple={false}
            columns={3}
          />
        </div>

        {/* ==========================================
            Phase & State Tags
            ========================================== */}
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
                onChange={(selected) => setForm({ ...form, state: selected[0] || '' })}
                multiple={false}
                columns={2}
              />
            </div>
          </div>
        </div>

        {/* ==========================================
            Management Team
            ========================================== */}
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
            <div>
              <ManagersMultiSelect
                selected={form.managerIds}
                onChange={(ids) => setForm({ ...form, managerIds: ids })}
                excludeId={form.leadId}
              />
            </div>
          </div>
        </div>

        {/* ==========================================
            Numeric Fields & Tags - Only for buildings/single projects
            ========================================== */}
        {showAllFields && (
          <>
            {/* Numeric Fields */}
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

            {/* Services Tags */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-2 text-[#3a3a3d]">שירותים</h2>
              <p className="text-sm text-[#8f8f96] mb-4">בחר את השירותים הניתנים בפרויקט זה</p>
              <TagSelector
                options={SERVICES}
                selected={form.services}
                onChange={(services) => setForm({ ...form, services })}
                columns={2}
              />
            </div>

            {/* Building Types - Grouped */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-2 text-[#3a3a3d]">סוגי מבנים</h2>
              <p className="text-sm text-[#8f8f96] mb-4">בחר את סוגי המבנים בפרויקט זה</p>
              <GroupedTagSelector
                groups={BUILDING_TYPES_GROUPED}
                selected={form.buildingTypes}
                onChange={(types) => setForm({ ...form, buildingTypes: types })}
              />
            </div>

            {/* Delivery Methods Tags */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-2 text-[#3a3a3d]">שיטת ביצוע</h2>
              <p className="text-sm text-[#8f8f96] mb-4">בחר את שיטת הביצוע</p>
              <TagSelector
                options={DELIVERY_METHODS}
                selected={form.deliveryMethods}
                onChange={(methods) => setForm({ ...form, deliveryMethods: methods })}
                columns={4}
              />
            </div>
          </>
        )}

        {/* ==========================================
            Description
            ========================================== */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 text-[#3a3a3d]">תיאור</h2>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
            placeholder="תיאור הפרויקט (אופציונלי)"
          />
        </div>

        {/* ==========================================
            Submit Buttons
            ========================================== */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn btn-primary btn-lg">
            <Save size={18} />
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
          <Link href={`/dashboard/projects/${id}`} className="btn btn-secondary btn-lg">ביטול</Link>
        </div>
      </form>
    </div>
  )
}
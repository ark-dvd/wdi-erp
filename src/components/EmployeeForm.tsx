'use client'

// ================================================
// WDI ERP - Employee Form Component
// Version: 20251211-143200
// Fixes: #6 education degrees + certificate upload, #7 departments list,
//        #8 email fields, #10 certifications section, #12 dates, #17 validations
// ================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, X, Plus, Trash2, Upload, FileText, Linkedin, Eye, Award } from 'lucide-react'

interface Child {
  name: string
  birthDate: string
  idNumber: string
}

interface Education {
  degree: string
  field: string
  institution: string
  year: string
  certificateUrl?: string
}

// #10: הוספת interface להכשרות
interface Certification {
  name: string
  issuer: string
  expiryDate: string
  certificateUrl?: string
}

interface EmployeeFormData {
  // פרטים אישיים
  firstName: string
  lastName: string
  idNumber: string
  birthDate: string
  phone: string
  email: string
  personalEmail: string // #8: אימייל אישי
  address: string
  linkedinUrl: string
  
  // בן/בת זוג
  spouseFirstName: string
  spouseLastName: string
  spouseIdNumber: string
  spouseBirthDate: string
  spousePhone: string
  spouseEmail: string
  marriageDate: string
  
  // ילדים
  children: Child[]
  
  // השכלה
  education: Education[]
  
  // #10: הכשרות והסמכות
  certifications: Certification[]
  
  // העסקה
  role: string
  department: string
  employmentType: string
  employeeCategory: string
  employmentPercent: string
  startDate: string
  endDate: string
  grossSalary: string
  status: string
  securityClearance: string
  
  // קבצים
  photoUrl: string
  idCardFileUrl: string
  idCardSpouseFileUrl: string
  driversLicenseFileUrl: string
  contractFileUrl: string
}

interface EmployeeFormProps {
  initialData?: Partial<EmployeeFormData>
  isEdit?: boolean
  employeeId?: string
}

const roles = [
  'מייסד שותף',
  'מנכ"ל',
  'מנהלת משרד',
  'מנהל תחום',
  'מנהל/ת פרויקט',
  'מזכירה',
  'עובד/ת',
]

// #7: רשימת תחומים מתוקנת
const departments = ['ביטחוני', 'מסחרי', 'תעשייה', 'תשתיות', 'מגורים']

const employmentTypes = ['אורגני', 'פרילנסר', 'חוזה שעות']
const employeeCategories = ['יצרני', 'הנהלה ואדמניסטרציה']
const statuses = ['פעיל', 'לא פעיל', 'בחופשה']

// #6: רשימת סוגי תארים מורחבת
const degreeTypes = ['הנדסאי', 'מהנדס', 'תואר ראשון', 'תואר שני', 'תואר שלישי']

export default function EmployeeForm({ initialData, isEdit, employeeId }: EmployeeFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    idNumber: initialData?.idNumber || '',
    birthDate: initialData?.birthDate || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    personalEmail: initialData?.personalEmail || '', // #8
    address: initialData?.address || '',
    linkedinUrl: initialData?.linkedinUrl || '',
    spouseFirstName: initialData?.spouseFirstName || '',
    spouseLastName: initialData?.spouseLastName || '',
    spouseIdNumber: initialData?.spouseIdNumber || '',
    spouseBirthDate: initialData?.spouseBirthDate || '',
    spousePhone: initialData?.spousePhone || '',
    spouseEmail: initialData?.spouseEmail || '',
    marriageDate: initialData?.marriageDate || '',
    children: initialData?.children || [],
    education: initialData?.education || [],
    certifications: initialData?.certifications || [], // #10
    role: initialData?.role || '',
    department: initialData?.department || '',
    employmentType: initialData?.employmentType || 'אורגני',
    employeeCategory: initialData?.employeeCategory || '',
    employmentPercent: initialData?.employmentPercent || '100',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    grossSalary: initialData?.grossSalary || '',
    status: initialData?.status || 'פעיל',
    securityClearance: initialData?.securityClearance || '',
    photoUrl: initialData?.photoUrl || '',
    idCardFileUrl: initialData?.idCardFileUrl || '',
    idCardSpouseFileUrl: initialData?.idCardSpouseFileUrl || '',
    driversLicenseFileUrl: initialData?.driversLicenseFileUrl || '',
    contractFileUrl: initialData?.contractFileUrl || '',
  })

  // #17: וולידציית ת.ז. - 9 ספרות בדיוק
  const validateIdNumber = (id: string): boolean => {
    const digitsOnly = id.replace(/\D/g, '')
    return digitsOnly.length === 9
  }

  // #17: נרמול טלפון נייד לפורמט 05X-XXXXXXX
  const normalizePhone = (phone: string): string | null => {
    // הסרת כל התווים שאינם ספרות
    const digitsOnly = phone.replace(/\D/g, '')
    
    // בדיקה שיש בדיוק 10 ספרות ומתחיל ב-05
    if (digitsOnly.length !== 10) return null
    if (!digitsOnly.startsWith('05')) return null
    
    // פורמט: 05X-XXXXXXX
    return `${digitsOnly.substring(0, 3)}-${digitsOnly.substring(3)}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // #17: טיפול בשינוי טלפון עם נרמול
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // #17: טיפול בשינוי ת.ז. עם וולידציה
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    // אפשר רק ספרות
    const digitsOnly = value.replace(/\D/g, '').substring(0, 9)
    setFormData(prev => ({ ...prev, [name]: digitsOnly }))
  }

  const addChild = () => {
    setFormData(prev => ({
      ...prev,
      children: [...prev.children, { name: '', birthDate: '', idNumber: '' }]
    }))
  }

  const removeChild = (index: number) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index)
    }))
  }

  const updateChild = (index: number, field: keyof Child, value: string) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.map((child, i) => 
        i === index ? { ...child, [field]: value } : child
      )
    }))
  }

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, { degree: '', field: '', institution: '', year: '', certificateUrl: '' }]
    }))
  }

  const removeEducation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }))
  }

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) => 
        i === index ? { ...edu, [field]: value } : edu
      )
    }))
  }

  // #10: פונקציות להכשרות
  const addCertification = () => {
    setFormData(prev => ({
      ...prev,
      certifications: [...prev.certifications, { name: '', issuer: '', expiryDate: '', certificateUrl: '' }]
    }))
  }

  const removeCertification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }))
  }

  const updateCertification = (index: number, field: keyof Certification, value: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.map((cert, i) => 
        i === index ? { ...cert, [field]: value } : cert
      )
    }))
  }

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
    
    if (!res.ok) throw new Error('Upload failed')
    const data = await res.json()
    return data.url
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: string, folder: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      const url = await uploadFile(file, folder)
      setFormData(prev => ({ ...prev, [field]: url }))
    } catch (err) {
      setError('שגיאה בהעלאת הקובץ')
    } finally {
      setLoading(false)
    }
  }

  // #6: העלאת תעודה לתואר
  const handleEducationFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      const url = await uploadFile(file, 'certificates')
      updateEducation(index, 'certificateUrl', url)
    } catch (err) {
      setError('שגיאה בהעלאת התעודה')
    } finally {
      setLoading(false)
    }
  }

  // #10: העלאת תעודה להכשרה
  const handleCertificationFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      const url = await uploadFile(file, 'certifications')
      updateCertification(index, 'certificateUrl', url)
    } catch (err) {
      setError('שגיאה בהעלאת התעודה')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // #17: וולידציות
    if (!validateIdNumber(formData.idNumber)) {
      setError('תעודת זהות חייבת להכיל 9 ספרות בדיוק')
      return
    }

    // #17: נרמול טלפון
    let normalizedPhone = formData.phone
    if (formData.phone) {
      const normalized = normalizePhone(formData.phone)
      if (!normalized) {
        setError('מספר טלפון נייד לא תקין - נדרש פורמט 05X-XXXXXXX')
        return
      }
      normalizedPhone = normalized
    }

    setLoading(true)

    try {
      const payload = {
        ...formData,
        phone: normalizedPhone, // #17: טלפון מנורמל
        employmentPercent: formData.employmentPercent ? parseFloat(formData.employmentPercent) : null,
        grossSalary: formData.grossSalary ? parseFloat(formData.grossSalary) : null,
        securityClearance: formData.securityClearance ? parseInt(formData.securityClearance) : null,
      }

      const url = isEdit ? `/api/hr/${employeeId}` : '/api/hr'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'שגיאה בשמירת העובד')
      }

      // #5: חזרה למסך הראשי
      router.push('/dashboard/hr')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // #6: פונקציה להמרת URL ל-proxy
  const getProxyUrl = (url: string): string => {
    if (url.includes('storage.googleapis.com')) {
      return `/api/file?url=${encodeURIComponent(url)}`
    }
    return url
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* פרטים אישיים */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">פרטים אישיים</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שם פרטי <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שם משפחה <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* #17: ת.ז. עם וולידציה */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תעודת זהות <span className="text-red-500">*</span>
              <span className="text-xs text-gray-400 mr-1">(9 ספרות)</span>
            </label>
            <input
              type="text"
              name="idNumber"
              value={formData.idNumber}
              onChange={handleIdChange}
              required
              maxLength={9}
              pattern="\d{9}"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תאריך לידה</label>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* #17: טלפון עם נרמול */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              טלפון נייד
              <span className="text-xs text-gray-400 mr-1">(05X-XXXXXXX)</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder="054-1234567"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ltr"
            />
          </div>
          {/* #8: אימייל חברה */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל חברה</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ltr"
            />
          </div>
          {/* #8: אימייל אישי */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל אישי</label>
            <input
              type="email"
              name="personalEmail"
              value={formData.personalEmail}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ltr"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">כתובת</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-1">
                <Linkedin size={16} />
                LinkedIn
              </div>
            </label>
            <input
              type="url"
              name="linkedinUrl"
              value={formData.linkedinUrl}
              onChange={handleChange}
              placeholder="https://linkedin.com/in/..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ltr"
            />
          </div>
        </div>
      </div>

      {/* העסקה */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">פרטי העסקה</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תפקיד <span className="text-red-500">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">בחר תפקיד</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {/* #7: תחומים מתוקנים */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תחום</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">בחר תחום</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סוג העסקה</label>
            <select
              name="employmentType"
              value={formData.employmentType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {employmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סוג עובד</label>
            <select
              name="employeeCategory"
              value={formData.employeeCategory}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">בחר סוג</option>
              {employeeCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אחוזי משרה</label>
            <input
              type="number"
              name="employmentPercent"
              value={formData.employmentPercent}
              onChange={handleChange}
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שכר ברוטו</label>
            <input
              type="number"
              name="grossSalary"
              value={formData.grossSalary}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תאריך התחלה</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תאריך סיום</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיווג ביטחוני</label>
            <select
              name="securityClearance"
              value={formData.securityClearance}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ללא</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>
        </div>
      </div>

      {/* בן/בת זוג */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">פרטי בן/בת זוג</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם פרטי</label>
            <input
              type="text"
              name="spouseFirstName"
              value={formData.spouseFirstName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם משפחה</label>
            <input
              type="text"
              name="spouseLastName"
              value={formData.spouseLastName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תעודת זהות</label>
            <input
              type="text"
              name="spouseIdNumber"
              value={formData.spouseIdNumber}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '').substring(0, 9)
                setFormData(prev => ({ ...prev, spouseIdNumber: digitsOnly }))
              }}
              maxLength={9}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תאריך לידה</label>
            <input
              type="date"
              name="spouseBirthDate"
              value={formData.spouseBirthDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
            <input
              type="tel"
              name="spousePhone"
              value={formData.spousePhone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input
              type="email"
              name="spouseEmail"
              value={formData.spouseEmail}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תאריך נישואין</label>
            <input
              type="date"
              name="marriageDate"
              value={formData.marriageDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* ילדים */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">ילדים</h2>
          <button
            type="button"
            onClick={addChild}
            disabled={formData.children.length >= 7}
            className="btn btn-secondary text-sm"
          >
            <Plus size={16} />
            הוסף ילד
          </button>
        </div>
        {formData.children.length === 0 ? (
          <p className="text-gray-500 text-center py-4">לא הוזנו ילדים</p>
        ) : (
          <div className="space-y-4">
            {formData.children.map((child, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">שם</label>
                    <input
                      type="text"
                      value={child.name}
                      onChange={(e) => updateChild(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">תאריך לידה</label>
                    <input
                      type="date"
                      value={child.birthDate}
                      onChange={(e) => updateChild(index, 'birthDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ת.ז.</label>
                    <input
                      type="text"
                      value={child.idNumber}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '').substring(0, 9)
                        updateChild(index, 'idNumber', digitsOnly)
                      }}
                      maxLength={9}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ltr"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeChild(index)}
                  className="p-2 text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* #6: השכלה עם תעודות צמודות */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">השכלה אקדמית</h2>
          <button
            type="button"
            onClick={addEducation}
            className="btn btn-secondary text-sm"
          >
            <Plus size={16} />
            הוסף תואר
          </button>
        </div>
        {formData.education.length === 0 ? (
          <p className="text-gray-500 text-center py-4">לא הוזנה השכלה</p>
        ) : (
          <div className="space-y-4">
            {formData.education.map((edu, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* #6: סוגי תארים מעודכנים */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">סוג תואר</label>
                      <select
                        value={edu.degree}
                        onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">בחר</option>
                        {degreeTypes.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">תחום</label>
                      <input
                        type="text"
                        value={edu.field}
                        onChange={(e) => updateEducation(index, 'field', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">מוסד</label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">שנת סיום</label>
                      <input
                        type="number"
                        value={edu.year}
                        onChange={(e) => updateEducation(index, 'year', e.target.value)}
                        min="1950"
                        max="2030"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEducation(index)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                {/* #6: טעינת תעודה צמודה + תצוגה מקדימה */}
                <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleEducationFileChange(e, index)}
                    className="hidden"
                    id={`edu-cert-${index}`}
                  />
                  <label
                    htmlFor={`edu-cert-${index}`}
                    className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 text-sm"
                  >
                    <Upload size={16} />
                    {edu.certificateUrl ? 'החלף תעודה' : 'העלה תעודה'}
                  </label>
                  {/* #6: תצוגה מקדימה */}
                  {edu.certificateUrl && (
                    <div className="flex items-center gap-2">
                      <a
                        href={getProxyUrl(edu.certificateUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                      >
                        <Eye size={16} />
                        צפה בתעודה
                      </a>
                      <span className="text-green-600 text-sm">✓ הועלה</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* #10: הכשרות, הסמכות ותעודות רישוי */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Award size={20} />
            הכשרות, הסמכות ותעודות רישוי
          </h2>
          <button
            type="button"
            onClick={addCertification}
            className="btn btn-secondary text-sm"
          >
            <Plus size={16} />
            הוסף הכשרה
          </button>
        </div>
        {formData.certifications.length === 0 ? (
          <p className="text-gray-500 text-center py-4">לא הוזנו הכשרות</p>
        ) : (
          <div className="space-y-4">
            {formData.certifications.map((cert, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">שם ההכשרה/תעודה</label>
                      <input
                        type="text"
                        value={cert.name}
                        onChange={(e) => updateCertification(index, 'name', e.target.value)}
                        placeholder="לדוגמה: רישיון מהנדס, עבודה בגובה..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">גוף מנפיק</label>
                      <input
                        type="text"
                        value={cert.issuer}
                        onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                        placeholder="לדוגמה: משרד העבודה, רשם המהנדסים..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">תוקף עד</label>
                      <input
                        type="date"
                        value={cert.expiryDate}
                        onChange={(e) => updateCertification(index, 'expiryDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCertification(index)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                {/* טעינת תעודה + תצוגה מקדימה */}
                <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleCertificationFileChange(e, index)}
                    className="hidden"
                    id={`cert-file-${index}`}
                  />
                  <label
                    htmlFor={`cert-file-${index}`}
                    className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 text-sm"
                  >
                    <Upload size={16} />
                    {cert.certificateUrl ? 'החלף תעודה' : 'העלה תעודה'}
                  </label>
                  {cert.certificateUrl && (
                    <div className="flex items-center gap-2">
                      <a
                        href={getProxyUrl(cert.certificateUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                      >
                        <Eye size={16} />
                        צפה בתעודה
                      </a>
                      <span className="text-green-600 text-sm">✓ הועלה</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* קבצים */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">קבצים ומסמכים</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תמונת פרופיל</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'photoUrl', 'photos')}
                className="hidden"
                id="photoUrl"
              />
              <label
                htmlFor="photoUrl"
                className="flex-1 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-500"
              >
                {formData.photoUrl ? '✓ הועלה' : 'בחר קובץ'}
              </label>
              {formData.photoUrl && (
                <img src={getProxyUrl(formData.photoUrl)} alt="" className="w-10 h-10 rounded object-cover" />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">צילום ת.ז.</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, 'idCardFileUrl', 'id-cards')}
              className="hidden"
              id="idCardFileUrl"
            />
            <label
              htmlFor="idCardFileUrl"
              className="block px-3 py-2 border border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-500"
            >
              {formData.idCardFileUrl ? '✓ הועלה' : 'בחר קובץ'}
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">צילום רישיון נהיגה</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, 'driversLicenseFileUrl', 'licenses')}
              className="hidden"
              id="driversLicenseFileUrl"
            />
            <label
              htmlFor="driversLicenseFileUrl"
              className="block px-3 py-2 border border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-500"
            >
              {formData.driversLicenseFileUrl ? '✓ הועלה' : 'בחר קובץ'}
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">חוזה העסקה</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, 'contractFileUrl', 'contracts')}
              className="hidden"
              id="contractFileUrl"
            />
            <label
              htmlFor="contractFileUrl"
              className="block px-3 py-2 border border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-500"
            >
              {formData.contractFileUrl ? '✓ הועלה' : 'בחר קובץ'}
            </label>
          </div>
        </div>
      </div>

      {/* כפתורי פעולה */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => router.push('/dashboard/hr')}
          className="btn btn-secondary"
        >
          <X size={20} />
          ביטול
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <Save size={20} />
          )}
          {isEdit ? 'עדכון' : 'שמירה'}
        </button>
      </div>
    </form>
  )
}
'use client'

// ================================================
// WDI ERP - Employee View Page
// Version: 20251211-143100
// Fixes: #11 show active projects only, #12 dates, #13 show all personal details
// ================================================

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowRight, Edit, Mail, Phone, MapPin, Calendar, Briefcase, GraduationCap, Users, FileText, Linkedin, Shield, Award, Eye } from 'lucide-react'

interface Employee {
  id: string
  firstName: string
  lastName: string
  idNumber: string
  birthDate: string | null
  phone: string | null
  email: string | null
  personalEmail: string | null
  address: string | null
  photoUrl: string | null
  linkedinUrl: string | null
  role: string
  department: string | null
  employeeCategory: string | null
  employmentType: string
  employmentPercent: number | null
  startDate: string | null
  endDate: string | null
  grossSalary: number | null
  status: string
  securityClearance: string | null
  spouseFirstName: string | null
  spouseLastName: string | null
  spouseIdNumber: string | null
  spouseBirthDate: string | null
  spousePhone: string | null
  spouseEmail: string | null
  marriageDate: string | null
  children: string | null
  education: string | null
  certifications: string | null
  idCardFileUrl: string | null
  driversLicenseFileUrl: string | null
  contractFileUrl: string | null
  ledProjects: Array<{ id: string; projectNumber: string; name: string; state: string }>
  managedProjects: Array<{ project: { id: string; projectNumber: string; name: string; state: string } }>
}

// פונקציה להמרת URL של GCS ל-proxy URL
function getProxyUrl(url: string | null): string | null {
  if (!url) return null
  if (url.includes('storage.googleapis.com')) {
    return `/api/file?url=${encodeURIComponent(url)}`
  }
  return url
}

export default function EmployeeViewPage() {
  const params = useParams()
  const id = params?.id as string
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchEmployee()
    }
  }, [id])

  const fetchEmployee = async () => {
    try {
      const res = await fetch(`/api/hr/${id}`)
      if (res.ok) {
        const data = await res.json()
        setEmployee(data)
      }
    } catch (error) {
      console.error('Error fetching employee:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">העובד לא נמצא</p>
        <Link href="/dashboard/hr" className="text-blue-600 hover:underline mt-2 inline-block">
          חזרה לרשימה
        </Link>
      </div>
    )
  }

  const children = employee.children 
    ? (typeof employee.children === 'string' ? JSON.parse(employee.children) : employee.children) 
    : []
  const education = employee.education 
    ? (typeof employee.education === 'string' ? JSON.parse(employee.education) : employee.education) 
    : []
  const certifications = employee.certifications 
    ? (typeof employee.certifications === 'string' ? JSON.parse(employee.certifications) : employee.certifications) 
    : []

  // #12: תיקון תאריכים - שימוש ב-UTC למניעת הזזת יום
  const formatDate = (date: string | null) => {
    if (!date) return '-'
    const d = new Date(date)
    const day = d.getUTCDate().toString().padStart(2, '0')
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0')
    const year = d.getUTCFullYear()
    return `${day}.${month}.${year}`
  }

  // חישוב גיל
  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getUTCFullYear()
    const monthDiff = today.getMonth() - birth.getUTCMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getUTCDate())) {
      age--
    }
    return age
  }

  // חישוב ותק
  const calculateTenure = (startDate: string | null) => {
    if (!startDate) return null
    const today = new Date()
    const start = new Date(startDate)
    const years = today.getFullYear() - start.getUTCFullYear()
    const months = today.getMonth() - start.getUTCMonth()
    let totalMonths = years * 12 + months
    if (today.getDate() < start.getUTCDate()) totalMonths--
    const y = Math.floor(totalMonths / 12)
    const m = totalMonths % 12
    if (y === 0) return `${m} חודשים`
    if (m === 0) return `${y} שנים`
    return `${y} שנים ו-${m} חודשים`
  }

  // #11: פרויקטים משויכים - לפי סטטוס העובד
  const getDisplayProjects = () => {
    const allProjects = [
      ...employee.ledProjects.map(p => ({ ...p, role: 'מוביל' })),
      ...employee.managedProjects.map(pm => ({ ...pm.project, role: 'מנהל' }))
    ]
    
    // עובד פעיל - רק פרויקטים פעילים
    if (employee.status === 'פעיל') {
      return allProjects.filter(p => p.state === 'פעיל')
    }
    
    // עובד לא פעיל - פרויקטים אחרונים (כולם)
    return allProjects
  }

  const displayProjects = getDisplayProjects()
  const projectsTitle = employee.status === 'פעיל' ? 'פרויקטים פעילים' : 'פרויקטים אחרונים'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/hr"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRight size={24} />
          </Link>
          <div className="flex items-center gap-4">
            {employee.photoUrl ? (
              <img
                src={getProxyUrl(employee.photoUrl)!}
                alt=""
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xl">
                  {employee.firstName[0]}{employee.lastName[0]}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {employee.firstName} {employee.lastName}
              </h1>
              <p className="text-gray-500">{employee.role}</p>
            </div>
          </div>
        </div>
        {/* #5: כפתור עריכה מוביל ישירות לעריכה */}
        <Link href={`/dashboard/hr/${id}/edit`} className="btn btn-primary">
          <Edit size={20} />
          עריכה
        </Link>
      </div>

      {/* סטטוס */}
      <div className="flex items-center gap-4">
        <span className={`badge ${
          employee.status === 'פעיל' ? 'badge-active' :
          employee.status === 'לא פעיל' ? 'badge-inactive' :
          'badge-pending'
        }`}>
          {employee.status}
        </span>
        {employee.securityClearance && (
          <span className="badge bg-purple-100 text-purple-700 flex items-center gap-1">
            <Shield size={14} />
            סיווג {employee.securityClearance}
          </span>
        )}
        {employee.department && (
          <span className="badge bg-gray-100 text-gray-700">{employee.department}</span>
        )}
        {employee.employeeCategory && (
          <span className="badge bg-blue-100 text-blue-700">{employee.employeeCategory}</span>
        )}
      </div>

      {/* שורה ראשונה: פרטים אישיים | פרטי העסקה + פרויקטים */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* #13: פרטים אישיים - הצגת כל השדות */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">פרטים אישיים</h2>
          <dl className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-gray-400"><FileText size={18} /></span>
              <dt className="text-gray-500 w-28">ת.ז.:</dt>
              <dd className="font-medium ltr">{employee.idNumber}</dd>
            </div>
            {employee.birthDate && (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400"><Calendar size={18} /></span>
                  <dt className="text-gray-500 w-28">תאריך לידה:</dt>
                  <dd className="font-medium">{formatDate(employee.birthDate)}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 w-[18px]"></span>
                  <dt className="text-gray-500 w-28">גיל:</dt>
                  <dd className="font-medium">{calculateAge(employee.birthDate)}</dd>
                </div>
              </>
            )}
            {employee.phone && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400"><Phone size={18} /></span>
                <dt className="text-gray-500 w-28">טלפון:</dt>
                <dd className="font-medium ltr">{employee.phone}</dd>
              </div>
            )}
            {employee.email && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400"><Mail size={18} /></span>
                <dt className="text-gray-500 w-28">אימייל חברה:</dt>
                <dd className="font-medium ltr">{employee.email}</dd>
              </div>
            )}
            {employee.personalEmail && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400"><Mail size={18} /></span>
                <dt className="text-gray-500 w-28">אימייל אישי:</dt>
                <dd className="font-medium ltr">{employee.personalEmail}</dd>
              </div>
            )}
            {employee.address && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400"><MapPin size={18} /></span>
                <dt className="text-gray-500 w-28">כתובת:</dt>
                <dd className="font-medium">{employee.address}</dd>
              </div>
            )}
            {employee.linkedinUrl && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400"><Linkedin size={18} /></span>
                <dt className="text-gray-500 w-28">LinkedIn:</dt>
                <dd>
                  <a 
                    href={employee.linkedinUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline ltr"
                  >
                    פתח פרופיל
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* פרטי העסקה + פרויקטים */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">פרטי העסקה</h2>
          <dl className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-gray-400"><Briefcase size={18} /></span>
              <dt className="text-gray-500 w-32">סוג העסקה:</dt>
              <dd className="font-medium">{employee.employmentType}</dd>
            </div>
            {employee.employmentPercent && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400 w-[18px]"></span>
                <dt className="text-gray-500 w-32">אחוזי משרה:</dt>
                <dd className="font-medium">{employee.employmentPercent}%</dd>
              </div>
            )}
            {employee.grossSalary && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400 w-[18px]"></span>
                <dt className="text-gray-500 w-32">שכר ברוטו:</dt>
                <dd className="font-medium">₪{employee.grossSalary.toLocaleString()}</dd>
              </div>
            )}
            {employee.startDate && (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400"><Calendar size={18} /></span>
                  <dt className="text-gray-500 w-32">תאריך התחלה:</dt>
                  <dd className="font-medium">{formatDate(employee.startDate)}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 w-[18px]"></span>
                  <dt className="text-gray-500 w-32">ותק:</dt>
                  <dd className="font-medium">{calculateTenure(employee.startDate)}</dd>
                </div>
              </>
            )}
            {employee.endDate && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400"><Calendar size={18} /></span>
                <dt className="text-gray-500 w-32">תאריך סיום:</dt>
                <dd className="font-medium">{formatDate(employee.endDate)}</dd>
              </div>
            )}
          </dl>

          {/* #11: פרויקטים משויכים - לפי סטטוס */}
          {displayProjects.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-md font-semibold text-gray-700 mb-3">
                {projectsTitle} ({displayProjects.length})
              </h3>
              <div className="space-y-2">
                {displayProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <span className="font-medium">{project.name}</span>
                      <span className="text-sm text-gray-500 mr-2">({project.projectNumber})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{project.role}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        project.state === 'פעיל' ? 'bg-green-100 text-green-700' :
                        project.state === 'הושלם' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {project.state}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* שורה שנייה: משפחה | השכלה ותעודות */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* משפחה - בן/בת זוג + ילדים */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            <div className="flex items-center gap-2">
              <Users size={20} />
              משפחה
            </div>
          </h2>
          
          {/* בן/בת זוג */}
          {employee.spouseFirstName ? (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-700 mb-3">בן/בת זוג</h3>
              <dl className="space-y-2">
                <div className="flex items-center gap-3">
                  <dt className="text-gray-500 w-28">שם:</dt>
                  <dd className="font-medium">{employee.spouseFirstName} {employee.spouseLastName}</dd>
                </div>
                {employee.spouseIdNumber && (
                  <div className="flex items-center gap-3">
                    <dt className="text-gray-500 w-28">ת.ז.:</dt>
                    <dd className="font-medium ltr">{employee.spouseIdNumber}</dd>
                  </div>
                )}
                {employee.spouseBirthDate && (
                  <div className="flex items-center gap-3">
                    <dt className="text-gray-500 w-28">תאריך לידה:</dt>
                    <dd className="font-medium">{formatDate(employee.spouseBirthDate)}</dd>
                  </div>
                )}
                {employee.marriageDate && (
                  <div className="flex items-center gap-3">
                    <dt className="text-gray-500 w-28">תאריך נישואין:</dt>
                    <dd className="font-medium">{formatDate(employee.marriageDate)}</dd>
                  </div>
                )}
                {employee.spousePhone && (
                  <div className="flex items-center gap-3">
                    <dt className="text-gray-500 w-28">טלפון:</dt>
                    <dd className="font-medium ltr">{employee.spousePhone}</dd>
                  </div>
                )}
                {employee.spouseEmail && (
                  <div className="flex items-center gap-3">
                    <dt className="text-gray-500 w-28">אימייל:</dt>
                    <dd className="font-medium ltr">{employee.spouseEmail}</dd>
                  </div>
                )}
              </dl>
            </div>
          ) : (
            <p className="text-gray-400 mb-4">לא הוזנו פרטי בן/בת זוג</p>
          )}

          {/* ילדים */}
          {children.length > 0 ? (
            <div className="pt-4 border-t">
              <h3 className="text-md font-medium text-gray-700 mb-3">ילדים ({children.length})</h3>
              <div className="space-y-2">
                {children.map((child: any, idx: number) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{child.name}</span>
                      {child.birthDate && (
                        <span className="text-sm text-gray-500">
                          {formatDate(child.birthDate)} (גיל {calculateAge(child.birthDate)})
                        </span>
                      )}
                    </div>
                    {child.idNumber && (
                      <div className="text-sm text-gray-500 mt-1">
                        ת.ז.: <span className="ltr inline-block">{child.idNumber}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t">
              <p className="text-gray-400">לא הוזנו ילדים</p>
            </div>
          )}
        </div>

        {/* השכלה ותעודות */}
        <div className="card">
          {/* השכלה אקדמית */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap size={20} />
              השכלה אקדמית
            </div>
          </h2>
          
          {education.length > 0 ? (
            <div className="space-y-3 mb-6">
              {education.map((edu: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{edu.degree} - {edu.field}</p>
                    <p className="text-sm text-gray-500">
                      {edu.institution} ({edu.year})
                    </p>
                  </div>
                  {edu.certificateUrl && (
                    <a
                      href={getProxyUrl(edu.certificateUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white rounded border hover:bg-gray-100"
                      title="צפה בתעודה"
                    >
                      <Eye size={18} className="text-blue-600" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 mb-6">לא הוזנה השכלה אקדמית</p>
          )}

          {/* הכשרות והסמכות */}
          <div className="pt-4 border-t">
            <h3 className="text-md font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Award size={18} />
              הכשרות, הסמכות ותעודות רישוי
            </h3>
            {certifications.length > 0 ? (
              <div className="space-y-3">
                {certifications.map((cert: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{cert.name}</p>
                      {cert.issuer && <p className="text-sm text-gray-500">{cert.issuer}</p>}
                      {cert.expiryDate && (
                        <p className="text-sm text-gray-500">תוקף עד: {formatDate(cert.expiryDate)}</p>
                      )}
                    </div>
                    {cert.certificateUrl && (
                      <a
                        href={getProxyUrl(cert.certificateUrl)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white rounded border hover:bg-gray-100"
                        title="צפה בתעודה"
                      >
                        <Eye size={18} className="text-blue-600" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">לא הוזנו הכשרות</p>
            )}
          </div>

          {/* מסמכים ותעודות */}
          <div className="pt-4 border-t mt-4">
            <h3 className="text-md font-medium text-gray-700 mb-3">מסמכים</h3>
            <div className="space-y-2">
              {employee.idCardFileUrl && (
                <a
                  href={getProxyUrl(employee.idCardFileUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <span>צילום תעודת זהות</span>
                  <Eye size={18} className="text-blue-600" />
                </a>
              )}
              {employee.driversLicenseFileUrl && (
                <a
                  href={getProxyUrl(employee.driversLicenseFileUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <span>רישיון נהיגה</span>
                  <Eye size={18} className="text-blue-600" />
                </a>
              )}
              {employee.contractFileUrl && (
                <a
                  href={getProxyUrl(employee.contractFileUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <span>חוזה העסקה</span>
                  <Eye size={18} className="text-blue-600" />
                </a>
              )}
              {!employee.idCardFileUrl && !employee.driversLicenseFileUrl && !employee.contractFileUrl && (
                <p className="text-gray-400">לא הועלו מסמכים</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
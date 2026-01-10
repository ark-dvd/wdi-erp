'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Car, Plus, Search, Filter, User, Gauge, Calendar, AlertTriangle } from 'lucide-react'

const statusLabels: Record<string, string> = { 
  ACTIVE: 'פעיל', 
  IN_SERVICE: 'בטיפול', 
  RETURNED: 'הוחזר', 
  SOLD: 'נמכר' 
}
const statusColors: Record<string, string> = { 
  ACTIVE: 'bg-green-100 text-green-800', 
  IN_SERVICE: 'bg-yellow-100 text-yellow-800', 
  RETURNED: 'bg-gray-100 text-gray-800', 
  SOLD: 'bg-red-100 text-red-800' 
}
const contractLabels: Record<string, string> = { 
  RENTAL: 'השכרה', 
  LEASING: 'ליסינג' 
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetch('/api/vehicles')
      .then(r => r.json())
      .then(data => {
        setVehicles(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = vehicles.filter(v => {
    const matchSearch = search === '' || 
      v.licensePlate?.toLowerCase().includes(search.toLowerCase()) ||
      v.manufacturer?.toLowerCase().includes(search.toLowerCase()) ||
      v.model?.toLowerCase().includes(search.toLowerCase()) ||
      v.currentDriver?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      v.currentDriver?.lastName?.toLowerCase().includes(search.toLowerCase())
    
    const matchStatus = statusFilter === 'all' || v.status === statusFilter
    
    return matchSearch && matchStatus
  })

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'ACTIVE').length,
    inService: vehicles.filter(v => v.status === 'IN_SERVICE').length,
    unassigned: vehicles.filter(v => !v.currentDriverId && v.status === 'ACTIVE').length,
  }

  if (loading) {
    return <div className="p-8 text-center">טוען...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ניהול רכבים</h1>
          <p className="text-gray-500 text-sm mt-1">{stats.total} רכבים במערכת</p>
        </div>
        <Link 
          href="/dashboard/vehicles/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={18} />
          רכב חדש
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'סה"כ רכבים', value: stats.total, icon: Car, color: 'blue' },
          { label: 'פעילים', value: stats.active, icon: Car, color: 'green' },
          { label: 'בטיפול', value: stats.inService, icon: AlertTriangle, color: 'yellow' },
          { label: 'לא משויכים', value: stats.unassigned, icon: User, color: 'gray' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${stat.color}-100`}>
                <stat.icon size={20} className={`text-${stat.color}-600`} />
              </div>
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="חיפוש לפי מספר רישוי, יצרן, דגם או נהג..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="ACTIVE">פעיל</option>
              <option value="IN_SERVICE">בטיפול</option>
              <option value="RETURNED">הוחזר</option>
              <option value="SOLD">נמכר</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vehicles List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Car size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {vehicles.length === 0 ? 'אין רכבים במערכת' : 'לא נמצאו רכבים התואמים לחיפוש'}
          </p>
          {vehicles.length === 0 && (
            <Link href="/dashboard/vehicles/new" className="text-blue-600 hover:underline mt-2 inline-block">
              הוסף רכב ראשון
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 text-sm text-gray-600">
              <tr>
                <th className="text-right p-4 font-medium">רכב</th>
                <th className="text-right p-4 font-medium">מספר רישוי</th>
                <th className="text-right p-4 font-medium">נהג נוכחי</th>
                <th className="text-right p-4 font-medium">ק"מ</th>
                <th className="text-right p-4 font-medium">חוזה</th>
                <th className="text-right p-4 font-medium">סטטוס</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(vehicle => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <Link href={`/dashboard/vehicles/${vehicle.id}`} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Car size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 hover:text-blue-600">
                          {vehicle.manufacturer} {vehicle.model}
                        </div>
                        <div className="text-sm text-gray-500">{vehicle.year} • {vehicle.color}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-gray-700">{vehicle.licensePlate}</span>
                  </td>
                  <td className="p-4">
                    {vehicle.currentDriver ? (
                      <Link 
                        href={`/dashboard/hr/${vehicle.currentDriver.id}`}
                        className="flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        {vehicle.currentDriver.photoUrl ? (
                          <img 
                            src={vehicle.currentDriver.photoUrl} 
                            alt="" 
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                            <User size={14} className="text-gray-500" />
                          </div>
                        )}
                        {vehicle.currentDriver.firstName} {vehicle.currentDriver.lastName}
                      </Link>
                    ) : (
                      <span className="text-gray-400">לא משויך</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Gauge size={14} />
                      {vehicle.currentKm?.toLocaleString() || '-'}
                    </div>
                  </td>
                  <td className="p-4">
                    {vehicle.contractType ? (
                      <div>
                        <div className="text-sm">{contractLabels[vehicle.contractType]}</div>
                        {vehicle.contractEndDate && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar size={12} />
                            עד {new Date(vehicle.contractEndDate).toLocaleDateString('he-IL')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[vehicle.status]}`}>
                      {statusLabels[vehicle.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

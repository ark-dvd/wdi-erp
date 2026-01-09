'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Car, Plus, User, Gauge, ChevronLeft } from 'lucide-react'

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

export default function MobileVehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/vehicles')
      .then(r => r.json())
      .then(data => {
        setVehicles(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">טוען...</div>
      </div>
    )
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
        <div className="bg-gray-100 rounded-full p-6 mb-6">
          <Car size={48} className="text-gray-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">אין רכבים</h1>
        <p className="text-gray-500 text-sm mb-6">
          הוסף את הרכב הראשון למערכת
        </p>
        <Link 
          href="/dashboard/vehicles/new"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={18} />
          הוסף רכב
        </Link>
      </div>
    )
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center z-10">
        <h1 className="text-lg font-bold">רכבים ({vehicles.length})</h1>
        <Link 
          href="/dashboard/vehicles/new"
          className="bg-blue-600 text-white p-2 rounded-lg"
        >
          <Plus size={20} />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-green-700">
            {vehicles.filter(v => v.status === 'ACTIVE').length}
          </div>
          <div className="text-xs text-green-600">פעילים</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-yellow-700">
            {vehicles.filter(v => v.status === 'IN_SERVICE').length}
          </div>
          <div className="text-xs text-yellow-600">בטיפול</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-gray-700">
            {vehicles.filter(v => !v.currentDriverId && v.status === 'ACTIVE').length}
          </div>
          <div className="text-xs text-gray-600">פנויים</div>
        </div>
      </div>

      {/* Vehicles List */}
      <div className="px-4 space-y-3">
        {vehicles.map(vehicle => (
          <Link
            key={vehicle.id}
            href={`/dashboard/vehicles/${vehicle.id}`}
            className="block bg-white rounded-xl border p-4 active:bg-gray-50"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Car size={24} className="text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {vehicle.manufacturer} {vehicle.model}
                  </div>
                  <div className="text-sm text-gray-500 font-mono">
                    {vehicle.licensePlate}
                  </div>
                </div>
              </div>
              <ChevronLeft size={20} className="text-gray-400 mt-1" />
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                {vehicle.currentDriver ? (
                  <div className="flex items-center gap-1 text-gray-600">
                    <User size={14} />
                    {vehicle.currentDriver.firstName} {vehicle.currentDriver.lastName}
                  </div>
                ) : (
                  <div className="text-gray-400">לא משויך</div>
                )}
                {vehicle.currentKm && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <Gauge size={14} />
                    {vehicle.currentKm.toLocaleString()} ק"מ
                  </div>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[vehicle.status]}`}>
                {statusLabels[vehicle.status]}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

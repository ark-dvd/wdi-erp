'use client'

import { Car, Wrench } from 'lucide-react'

export default function MobileVehiclesPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
      <div className="bg-gray-100 rounded-full p-6 mb-6">
        <Car size={48} className="text-gray-400" />
      </div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">מודול רכבים</h1>
      <div className="flex items-center gap-2 text-orange-600 mb-4">
        <Wrench size={18} />
        <span className="font-medium">בפיתוח</span>
      </div>
      <p className="text-gray-500 text-sm leading-relaxed">
        מודול הרכבים יאפשר לך לדווח על קילומטראז', 
        תדלוקים, וניהול תחזוקה שוטפת של רכבי החברה.
      </p>
      <p className="text-gray-400 text-xs mt-6">
        צפוי להיות זמין בקרוב
      </p>
    </div>
  )
}
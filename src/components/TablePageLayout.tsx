// src/components/TablePageLayout.tsx
// גרסה: v20251217-210000

import React from 'react'

interface TablePageLayoutProps {
  /** אזור הכותרת, טאבים, פילטרים וכותרות טבלה - יישאר דבוק */
  header: React.ReactNode
  /** אזור שורות הטבלה - יגלול */
  children: React.ReactNode
}

export default function TablePageLayout({ header, children }: TablePageLayoutProps) {
  return (
    <div className="-m-6 flex flex-col h-[calc(100vh-0px)]">
      {/* אזור דבוק - לא גולל */}
      <div className="flex-shrink-0 bg-gray-50 p-6 pb-0">
        {header}
      </div>
      
      {/* אזור גלילה - רק שורות הטבלה */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {children}
      </div>
    </div>
  )
}

// ================================================
// WDI ERP - Admin Page Header Component
// Version: 20260125-MAYBACH
// Consistent header for Admin Console pages
// ================================================

'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface AdminPageHeaderProps {
  title: string
  description: string
  backHref?: string
  backLabel?: string
}

export function AdminPageHeader({
  title,
  description,
  backHref = '/dashboard/admin',
  backLabel = 'חזרה',
}: AdminPageHeaderProps) {
  return (
    <div className="mb-8">
      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        <span>{backLabel}</span>
      </Link>

      {/* Title + Description */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  )
}

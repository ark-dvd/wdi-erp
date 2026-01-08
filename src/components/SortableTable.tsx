'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export interface Column<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
  className?: string
}

interface SortableTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
  onRowClick?: (item: T) => void
  emptyMessage?: string
}

type SortDirection = 'asc' | 'desc' | null

export default function SortableTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  onRowClick,
  emptyMessage = 'אין נתונים להצגה',
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortDirection(null)
        setSortKey(null)
      }
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data

    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortKey)
      const bValue = getNestedValue(b, sortKey)

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1

      // Compare values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue, 'he')
          : bValue.localeCompare(aValue, 'he')
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime()
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      // Default string comparison
      const aStr = String(aValue)
      const bStr = String(bValue)
      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr, 'he')
        : bStr.localeCompare(aStr, 'he')
    })
  }, [data, sortKey, sortDirection])

  const getSortIcon = (key: string) => {
    if (sortKey !== key) {
      return <ChevronsUpDown size={16} className="text-gray-300" />
    }
    if (sortDirection === 'asc') {
      return <ChevronUp size={16} className="text-blue-600" />
    }
    return <ChevronDown size={16} className="text-blue-600" />
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-auto max-h-[calc(100vh-280px)]">
      <table className="w-full">
        <thead className="sticky top-0 z-10">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={`${column.className || ''} ${
                  column.sortable !== false ? 'sortable' : ''
                }`}
                onClick={() =>
                  column.sortable !== false && handleSort(String(column.key))
                }
              >
                <div className="flex items-center gap-2">
                  <span>{column.label}</span>
                  {column.sortable !== false && getSortIcon(String(column.key))}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item) => (
            <tr
              key={String(item[keyField])}
              onClick={() => onRowClick?.(item)}
              className={onRowClick ? 'cursor-pointer' : ''}
            >
              {columns.map((column) => (
                <td key={String(column.key)} className={column.className}>
                  {column.render
                    ? column.render(item)
                    : getNestedValue(item, String(column.key))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Helper to get nested object values like "manager.firstName"
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}
'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, Calendar, Car, Bot, LogOut } from 'lucide-react'
import Link from 'next/link'

interface MobileLayoutClientProps {
  children: React.ReactNode
  userName: string
}

export default function MobileLayoutClient({ children, userName }: MobileLayoutClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()

  const getPageTitle = () => {
    if (pathname?.startsWith('/m/events')) return 'יומן אירועים'
    if (pathname?.startsWith('/m/vehicles')) return 'רכבים'
    if (pathname?.startsWith('/m/agent')) return 'WDI Agent'
    return 'WDI ERP'
  }

  const menuItems = [
    { href: '/m/events', label: 'יומן אירועים', icon: Calendar, disabled: false },
    { href: '/m/vehicles', label: 'רכבים', icon: Car, disabled: true, badge: 'בפיתוח' },
    { href: '/m/agent', label: 'WDI Agent', icon: Bot, disabled: false },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-1"
        >
          <Menu size={24} />
        </button>
        <div className="font-semibold">
          {getPageTitle()}
        </div>
        <div>
          <img src="/logo-white.png" alt="WDI" className="h-8 w-auto" />
        </div>
      </header>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="bg-[#1e3a5f] text-white px-4 py-4 flex items-center justify-between">
          <img src="/logo-white.png" alt="WDI" className="h-8 w-auto" />
          <button onClick={() => setDrawerOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 py-4">
          {menuItems.map((item) => {
            const isActive = pathname?.startsWith(item.href)
            const Icon = item.icon

            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className="flex items-center gap-3 px-4 py-3 text-gray-400 cursor-not-allowed"
                >
                  <Icon size={22} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full mr-auto">
                      {item.badge}
                    </span>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 ${
                  isActive
                    ? 'bg-[#1e3a5f]/10 text-[#1e3a5f] border-r-4 border-[#1e3a5f]'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={22} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-3">
            מחובר כ: <span className="font-medium text-gray-800">{userName}</span>
          </div>
          <a
            href="/api/auth/signout"
            className="flex items-center gap-2 text-red-600 hover:text-red-700"
          >
            <LogOut size={18} />
            <span>התנתק</span>
          </a>
        </div>
      </div>

      {/* Content */}
      <main className="pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-center items-center z-40">
        <Link href="/m/events" className="flex flex-col items-center gap-1 text-[#1e3a5f] mx-8">
          <Calendar size={24} />
          <span className="text-xs">אירועים</span>
        </Link>
        <Link href="/m/events/new" className="flex flex-col items-center gap-1 -mt-6 mx-8">
          <div className="bg-[#1e3a5f] text-white rounded-full p-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <span className="text-xs text-[#1e3a5f] font-medium">חדש</span>
        </Link>
      </nav>
    </div>
  )
}
// ============================================
// src/components/Toast.tsx
// Version: 20260124
// UI-025, UI-016, UI-017, UI-024: Toast notification component
// Provides clear success/error feedback to eliminate outcome ambiguity
// ============================================

'use client'

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react'
import { CheckCircle, XCircle, X, AlertCircle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, duration?: number) => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Toast Provider component - wrap your app with this to enable toasts
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setToasts(prev => [...prev, { id, type, message, duration }])
  }, [])

  const showSuccess = useCallback((message: string) => {
    showToast('success', message, 3000)
  }, [showToast])

  const showError = useCallback((message: string) => {
    showToast('error', message, 5000)
  }, [showToast])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

/**
 * Hook to use toast notifications
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

/**
 * Individual toast item
 */
function ToastItem({
  toast,
  onRemove
}: {
  toast: ToastMessage
  onRemove: (id: string) => void
}) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id)
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onRemove])

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <AlertCircle className="w-5 h-5 text-blue-500" />,
  }

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  }

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800',
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${bgColors[toast.type]} animate-slide-in`}
      role="alert"
      dir="rtl"
    >
      {icons[toast.type]}
      <span className={`flex-1 text-sm font-medium ${textColors[toast.type]}`}>
        {toast.message}
      </span>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 hover:bg-black/5 rounded-full transition-colors"
        aria-label="סגור"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  )
}

/**
 * Container for all toasts - positioned at top-left for RTL
 */
function ToastContainer({
  toasts,
  onRemove
}: {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 left-4 z-50 flex flex-col gap-2 max-w-sm"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

// Add CSS animation via style tag (will be included once)
if (typeof window !== 'undefined') {
  const styleId = 'toast-animations'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes slide-in {
        from {
          transform: translateX(-100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      .animate-slide-in {
        animation: slide-in 0.3s ease-out;
      }
    `
    document.head.appendChild(style)
  }
}

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import type { ToastItem } from '../types'

interface ToastContextValue {
  notify: (type: ToastItem['type'], title: string, detail?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), [])
  const notify = useCallback((type: ToastItem['type'], title: string, detail?: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setItems((current) => [...current.slice(-3), { id, type, title, detail }])
    window.setTimeout(() => dismiss(id), 5200)
  }, [dismiss])
  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map((item) => (
          <div className={`toast toast--${item.type}`} key={item.id}>
            <span>{item.type === 'success' ? <CheckCircle2 /> : item.type === 'error' ? <CircleAlert /> : <Info />}</span>
            <div><strong>{item.title}</strong>{item.detail && <p>{item.detail}</p>}</div>
            <button type="button" onClick={() => dismiss(item.id)} aria-label="Закрыть"><X /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}

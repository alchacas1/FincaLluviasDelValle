import { useCallback } from 'react'

import { toast } from 'sonner'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface UseToastResult {
  showToast: (message: string, type?: ToastType, duration?: number) => void
}

export default function useToast(): UseToastResult {
  const showToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    toast[type](message, duration ? { duration } : undefined)
  }, [])

  return { showToast }
}
import { type ReactNode } from 'react'
import { Toaster } from 'sonner'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <>
      <Toaster position="top-right" richColors closeButton duration={3000} />
      {children}
    </>
  )
}
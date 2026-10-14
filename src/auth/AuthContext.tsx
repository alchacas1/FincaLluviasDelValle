import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User } from 'firebase/auth'

import { authService } from '../services/auth'

interface AuthContextValue {
  user: User | null
  isInitializing: boolean
  profileError: string | null
  loginWithPassword: (email: string, password: string) => Promise<void>
  registerWithPassword: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  retryProfileSync: () => Promise<void>
}

interface AuthProviderProps {
  children: ReactNode
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: AuthProviderProps) {
  const [sessionUser, setSessionUser] = useState<User | null>(null)
  const [pendingUser, setPendingUser] = useState<User | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const epochRef = useRef(0)

  const initializeUser = useCallback(async (user: User, epoch: number) => {
    setPendingUser(user)
    setIsInitializing(true)
    setProfileError(null)

    try {
      await authService.syncProfile(user)
      if (epochRef.current !== epoch) return
      setSessionUser(user)
      setPendingUser(null)
    } catch {
      if (epochRef.current !== epoch) return
      setSessionUser(null)
      setProfileError('No fue posible preparar tu perfil.')
    } finally {
      if (epochRef.current === epoch) setIsInitializing(false)
    }
  }, [])

  useEffect(() => authService.observe((user) => {
    const epoch = ++epochRef.current

    if (!user) {
      setSessionUser(null)
      setPendingUser(null)
      setProfileError(null)
      setIsInitializing(false)
      return
    }

    void initializeUser(user, epoch)
  }), [initializeUser])

  const retryProfileSync = useCallback(async () => {
    if (!pendingUser) return
    const epoch = ++epochRef.current
    await initializeUser(pendingUser, epoch)
  }, [initializeUser, pendingUser])

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    await authService.loginWithPassword(email, password)
  }, [])

  const registerWithPassword = useCallback(async (email: string, password: string) => {
    await authService.registerWithPassword(email, password)
  }, [])

  const loginWithGoogle = useCallback(async () => {
    await authService.loginWithGoogle()
  }, [])

  const logout = useCallback(async () => {
    ++epochRef.current
    await authService.logout()
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user: sessionUser,
    isInitializing,
    profileError,
    loginWithPassword,
    registerWithPassword,
    loginWithGoogle,
    logout,
    retryProfileSync,
  }), [
    isInitializing,
    loginWithGoogle,
    loginWithPassword,
    logout,
    profileError,
    registerWithPassword,
    retryProfileSync,
    sessionUser,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.')
  }

  return context
}

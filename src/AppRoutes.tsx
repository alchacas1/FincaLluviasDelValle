import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import { App } from './App'
import { useAuth } from './auth/AuthContext'
import { PublicOnlyRoute, RequireAuth } from './auth/AuthRoute'
import { LoginPage } from './pages/LoginPage'

export function AuthenticatedRecordsPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleExit = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return <App onExit={handleExit} />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/registros" element={<RequireAuth><AuthenticatedRecordsPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/registros" replace />} />
    </Routes>
  )
}

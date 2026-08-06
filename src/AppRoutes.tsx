import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import { App } from './App'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'

export function AppRoutes() {
  const navigate = useNavigate()

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/login" element={<LoginPage onEnter={() => navigate('/registros', { replace: true })} />} />
      <Route path="/registros" element={<App onExit={() => navigate('/home')} />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}
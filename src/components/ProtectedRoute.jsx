import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store'

// Redirige vers /login si aucun utilisateur n'est connecté.
export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

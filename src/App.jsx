import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Chantiers from './pages/Chantiers'
import Placeholder from './pages/Placeholder'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/chantiers" element={<Chantiers />} />
        <Route path="/achats" element={<Placeholder title="Achats" />} />
        <Route path="/planning" element={<Placeholder title="Planning" />} />
        <Route path="/courses" element={<Placeholder title="Courses" />} />
      </Route>

      <Route path="/" element={<Navigate to="/chantiers" replace />} />
      <Route path="*" element={<Navigate to="/chantiers" replace />} />
    </Routes>
  )
}

export default App

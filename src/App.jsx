import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Chantiers from './pages/Chantiers'
import ChantierDetail from './pages/ChantierDetail'
import OuvragesTab from './pages/OuvragesTab'
import AchatsTab from './pages/AchatsTab'
import FilTab from './pages/FilTab'
import ChantierTabPlaceholder from './pages/ChantierTabPlaceholder'
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
        <Route path="/chantiers/:id" element={<ChantierDetail />}>
          <Route index element={<Navigate to="ouvrages" replace />} />
          <Route path="ouvrages" element={<OuvragesTab />} />
          <Route path="achats" element={<AchatsTab />} />
          <Route path="fil" element={<FilTab />} />
          <Route
            path="reunion"
            element={<ChantierTabPlaceholder title="Réunion" />}
          />
          <Route
            path="feedbacks"
            element={<ChantierTabPlaceholder title="Feedbacks" />}
          />
        </Route>
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

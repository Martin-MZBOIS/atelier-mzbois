import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Chantiers from './pages/Chantiers'
import ChantierDetail from './pages/ChantierDetail'
import OuvragesTab from './pages/OuvragesTab'
import AchatsTab from './pages/AchatsTab'
import FilTab from './pages/FilTab'
import ReunionTab from './pages/ReunionTab'
import FeedbacksTab from './pages/FeedbacksTab'
import AchatsGlobal from './pages/AchatsGlobal'
import CoursesGlobal from './pages/CoursesGlobal'
import PlanningGlobal from './pages/PlanningGlobal'
import Contacts from './pages/Contacts'
import Bibliotheque from './pages/Bibliotheque'

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
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chantiers" element={<Chantiers />} />
        <Route path="/chantiers/:id" element={<ChantierDetail />}>
          <Route index element={<Navigate to="ouvrages" replace />} />
          <Route path="ouvrages" element={<OuvragesTab />} />
          <Route path="achats" element={<AchatsTab />} />
          <Route path="fil" element={<FilTab />} />
          <Route path="reunion" element={<ReunionTab />} />
          <Route path="feedbacks" element={<FeedbacksTab />} />
        </Route>
        <Route path="/achats" element={<AchatsGlobal />} />
        <Route path="/planning" element={<PlanningGlobal />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/bibliotheque" element={<Bibliotheque />} />
        <Route path="/courses" element={<CoursesGlobal />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App

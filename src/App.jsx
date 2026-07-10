import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'

// Code splitting par route : chaque page est chargée dans son propre chunk,
// et les composants lourds (Planning, COPIL) uniquement à la navigation.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Chantiers = lazy(() => import('./pages/Chantiers'))
const ChantierDetail = lazy(() => import('./pages/ChantierDetail'))
const OuvragesTab = lazy(() => import('./pages/OuvragesTab'))
const AnalytiqueTab = lazy(() => import('./pages/AnalytiqueTab'))
const AchatsTab = lazy(() => import('./pages/AchatsTab'))
const ChantierCoursesTab = lazy(() => import('./pages/ChantierCoursesTab'))
const FilTab = lazy(() => import('./pages/FilTab'))
const ReunionTab = lazy(() => import('./pages/ReunionTab'))
const FeedbacksTab = lazy(() => import('./pages/FeedbacksTab'))
const HistoriqueTab = lazy(() => import('./pages/HistoriqueTab'))
const AchatsGlobal = lazy(() => import('./pages/AchatsGlobal'))
const CoursesGlobal = lazy(() => import('./pages/CoursesGlobal'))
const PlanningGlobal = lazy(() => import('./pages/PlanningGlobal'))
const Contacts = lazy(() => import('./pages/Contacts'))
const Bibliotheque = lazy(() => import('./pages/Bibliotheque'))
const Copil = lazy(() => import('./pages/Copil'))
const Assistance = lazy(() => import('./pages/Assistance'))
const Parametres = lazy(() => import('./pages/Parametres'))

function App() {
  return (
    <Suspense fallback={<div className="route-loading">Chargement…</div>}>
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
            <Route path="courses" element={<ChantierCoursesTab />} />
            <Route path="fil" element={<FilTab />} />
            <Route path="reunion" element={<ReunionTab />} />
            <Route path="feedbacks" element={<FeedbacksTab />} />
            <Route path="analytique" element={<AnalytiqueTab />} />
            <Route path="historique" element={<HistoriqueTab />} />
          </Route>
          <Route path="/achats" element={<AchatsGlobal />} />
          <Route path="/planning" element={<PlanningGlobal />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/bibliotheque" element={<Bibliotheque />} />
          <Route path="/copil" element={<Copil />} />
          <Route path="/assistance" element={<Assistance />} />
          <Route path="/parametres" element={<Parametres />} />
          <Route path="/courses" element={<CoursesGlobal />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App

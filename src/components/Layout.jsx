import { useEffect } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { useSettings } from '../store/settings'
import { ROLES } from '../lib/roles'

// Onglets de l'application (id = clé pour les droits d'accès).
const TABS = [
  { to: '/dashboard', id: 'dashboard', label: 'Tableau de bord' },
  { to: '/chantiers', id: 'chantiers', label: 'Chantiers' },
  { to: '/achats', id: 'achats', label: 'Achats' },
  { to: '/courses', id: 'courses', label: 'Courses' },
  { to: '/planning', id: 'planning', label: 'Planning' },
  { to: '/bibliotheque', id: 'bibliotheque', label: 'Bibliothèques' },
  { to: '/copil', id: 'copil', label: 'COPIL' },
  { to: '/contacts', id: 'contacts', label: 'Contacts' },
  { to: '/assistance', id: 'assistance', label: 'Assistance' },
  { to: '/parametres', id: 'parametres', label: 'Paramètres', dirOnly: true },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const loadSettings = useSettings((s) => s.load)
  const settingsLoaded = useSettings((s) => s.loaded)
  const canAccess = useSettings((s) => s.canAccess)
  const droits = useSettings((s) => s.droits)

  const role = user ? ROLES[user.role] : null

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const visibleTabs = TABS.filter((tab) => {
    if (tab.dirOnly) return user?.role === 'dir'
    return canAccess(user?.role, tab.id)
  })
  // (droits référencé pour recalculer la liste quand ils changent)
  void droits

  // Bloque l'accès direct par URL à un onglet non autorisé pour le rôle.
  const currentTab = TABS.find(
    (t) => location.pathname === t.to || location.pathname.startsWith(t.to + '/')
  )
  const blocked =
    settingsLoaded &&
    currentTab &&
    !currentTab.dirOnly &&
    !canAccess(user?.role, currentTab.id)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-logo">MZ</span>
          <div className="app-brand-text">
            <div className="app-title">MZ Bois &amp; Compagnie</div>
            <div className="app-subtitle">Atelier — Gestion chantiers</div>
          </div>
        </div>

        <div className="app-user">
          {role && (
            <span className="app-role">
              {role.icon} {role.label}
            </span>
          )}
          <span className="app-username">
            {user?.prenom} {user?.nom}
          </span>
          <button className="btn-ghost" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </header>

      <nav className="app-nav">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              'app-tab' + (isActive ? ' app-tab--active' : '')
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <main className="app-main">
        {blocked ? <Navigate to="/dashboard" replace /> : <Outlet />}
      </main>
    </div>
  )
}

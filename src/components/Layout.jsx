import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { ROLES } from '../lib/roles'

// Onglets de l'application. On ajoutera les autres au fil de la migration.
const TABS = [
  { to: '/chantiers', label: 'Chantiers' },
  { to: '/achats', label: 'Achats' },
  { to: '/planning', label: 'Planning' },
  { to: '/courses', label: 'Courses' },
]

export default function Layout() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const role = user ? ROLES[user.role] : null

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-logo">MZ</span>
          <span className="app-title">Atelier MZ Bois</span>
        </div>

        <nav className="app-nav">
          {TABS.map((tab) => (
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

        <div className="app-user">
          {role && (
            <span className="app-role" style={{ '--role-color': role.color }}>
              {role.short}
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

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

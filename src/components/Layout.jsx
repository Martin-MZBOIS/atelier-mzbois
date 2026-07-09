import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { useSettings } from '../store/settings'
import { ROLES } from '../lib/roles'
import Icon from './Icon'

// Élément de navigation : id = clé des droits d'accès.
// to = route ; certains items COPIL partagent /copil avec un paramètre ?o=.
const DASHBOARD = { to: '/dashboard', id: 'dashboard', label: 'Tableau de bord', icon: 'dashboard' }

// Chapitres numérotés de la navigation latérale.
const CHAPTERS = [
  {
    num: '01',
    title: 'Chantiers',
    items: [
      { to: '/chantiers', id: 'chantiers', label: 'Chantiers', icon: 'building' },
      { to: '/achats', id: 'achats', label: 'Achats', icon: 'cart' },
      { to: '/courses', id: 'courses', label: 'Courses', icon: 'truck' },
    ],
  },
  {
    num: '02',
    title: 'Organisation',
    items: [
      { to: '/planning', id: 'planning', label: 'Planning', icon: 'calendar' },
      { to: '/dashboard#taches', id: 'dashboard', label: 'Tâches', icon: 'checklist' },
    ],
  },
  {
    num: '03',
    title: 'COPIL',
    items: [
      { to: '/copil?o=chantiers', id: 'copil', label: 'Réunion de chantiers', icon: 'clipboard' },
      { to: '/copil?o=hommes_cles', id: 'copil', label: 'Hommes clés', icon: 'users' },
      { to: '/copil?o=strategie', id: 'copil', label: 'Stratégie', icon: 'chart' },
    ],
  },
  {
    num: '04',
    title: 'Ressources',
    items: [
      { to: '/bibliotheque', id: 'bibliotheque', label: 'Bibliothèques', icon: 'book' },
      { to: '/contacts', id: 'contacts', label: 'Contacts', icon: 'contact' },
    ],
  },
  {
    num: '05',
    title: 'Admin',
    items: [
      { to: '/parametres', id: 'parametres', label: 'Paramètres', icon: 'settings', dirOnly: true },
      { to: '/assistance', id: 'assistance', label: 'Assistance', icon: 'help' },
    ],
  },
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
  void droits // recalcule la nav quand les droits changent

  function itemVisible(item) {
    if (item.dirOnly) return user?.role === 'dir'
    return canAccess(user?.role, item.id)
  }

  function isActive(item) {
    const [path, query] = item.to.split('?')
    const cleanPath = path.split('#')[0]
    const onRoute =
      location.pathname === cleanPath || location.pathname.startsWith(cleanPath + '/')
    if (!onRoute) return false
    // Items COPIL : distingués par le paramètre ?o=.
    if (query) {
      const want = new URLSearchParams(query).get('o')
      const cur = new URLSearchParams(location.search).get('o') || 'chantiers'
      return want === cur
    }
    // Item Tâches vs Tableau de bord : distingués par le hash.
    if (path.includes('#taches')) return location.hash === '#taches'
    if (cleanPath === '/dashboard') return location.hash !== '#taches'
    return true
  }

  // Blocage accès direct par URL à un onglet non autorisé.
  const allItems = [DASHBOARD, ...CHAPTERS.flatMap((c) => c.items)]
  const currentItem = allItems.find(
    (t) =>
      location.pathname === t.to.split('?')[0].split('#')[0] ||
      location.pathname.startsWith(t.to.split('?')[0].split('#')[0] + '/')
  )
  const blocked =
    settingsLoaded &&
    currentItem &&
    !currentItem.dirOnly &&
    !canAccess(user?.role, currentItem.id)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function NavItem({ item }) {
    const active = isActive(item)
    return (
      <button
        className={'nav-item' + (active ? ' nav-item--active' : '')}
        onClick={() => navigate(item.to)}
      >
        <Icon name={item.icon} size={16} className="nav-item-ico" />
        <span className="nav-item-lbl">{item.label}</span>
      </button>
    )
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-logo">MZ</span>
          <div className="sidebar-brand-text">
            <div className="sidebar-title">MZ Bois &amp; Compagnie</div>
            <div className="sidebar-subtitle">Atelier</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavItem item={DASHBOARD} />

          {CHAPTERS.filter((ch) => {
            if (ch.dirOnly) return user?.role === 'dir'
            return ch.items.some(itemVisible)
          }).map((ch) => {
            const items = ch.items.filter(itemVisible)
            if (items.length === 0) return null
            return (
              <div key={ch.num} className="nav-chapter">
                <div className="nav-chapter-head">
                  <span className="nav-chapter-num">{ch.num}</span>
                  <span className="nav-chapter-line" />
                  <span className="nav-chapter-title">{ch.title}</span>
                </div>
                {items.map((item) => (
                  <NavItem key={item.label} item={item} />
                ))}
              </div>
            )
          })}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-name">
            {user?.prenom} {user?.nom}
          </div>
          <div className="sidebar-user-role">{role ? role.label : ''}</div>
          <button className="sidebar-logout" onClick={handleLogout}>
            <Icon name="logout" size={14} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="app-main">
        {blocked ? <Navigate to="/dashboard" replace /> : <Outlet />}
      </main>
    </div>
  )
}

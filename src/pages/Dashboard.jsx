import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../store'
import { amenerAlEcran } from '../lib/dashboard'
import DashboardDir from './dashboard/DashboardDir'
import DashboardBe from './dashboard/DashboardBe'
import DashboardProg from './dashboard/DashboardProg'
import DashboardProd from './dashboard/DashboardProd'
import DashboardCa from './dashboard/DashboardCa'
import DashboardAdmin from './dashboard/DashboardAdmin'

// Chaque rôle a son propre tableau de bord : il n'affiche que ce dont ce rôle
// a besoin.
const PAR_ROLE = {
  dir: DashboardDir,
  be: DashboardBe,
  prog: DashboardProg,
  prod: DashboardProd,
  ca: DashboardCa,
  admin: DashboardAdmin,
}

export default function Dashboard() {
  const role = useAuthStore((s) => s.user?.role)
  const { hash, key } = useLocation()
  const Vue = PAR_ROLE[role]

  // L'entrée « Tâches » de la barre latérale pointe sur /dashboard#taches.
  // Le bloc n'existe qu'une fois les données chargées : on le guette un court
  // moment plutôt que de tenter un défilement dans le vide.
  useEffect(() => {
    if (hash !== '#taches') return
    const guet = setInterval(() => {
      const el = document.getElementById('taches')
      if (!el) return
      clearInterval(guet)
      amenerAlEcran(el)
    }, 120)
    const abandon = setTimeout(() => clearInterval(guet), 5000)
    return () => {
      clearInterval(guet)
      clearTimeout(abandon)
    }
  }, [hash, key, role])

  if (!Vue) return <section className="page"><p className="muted">Aucun tableau de bord pour ce rôle.</p></section>
  return <Vue />
}

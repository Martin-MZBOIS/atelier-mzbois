import { useAuthStore } from '../store'
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
  const Vue = PAR_ROLE[role]
  if (!Vue) return <section className="page"><p className="muted">Aucun tableau de bord pour ce rôle.</p></section>
  return <Vue />
}

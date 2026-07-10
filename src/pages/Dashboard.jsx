import { useAuthStore } from '../store'
import DashboardLegacy from './DashboardLegacy'
import DashboardDir from './dashboard/DashboardDir'
import DashboardBe from './dashboard/DashboardBe'
import DashboardProg from './dashboard/DashboardProg'
import DashboardProd from './dashboard/DashboardProd'
import DashboardCa from './dashboard/DashboardCa'

// Chaque rôle a son propre tableau de bord : il n'affiche que ce dont ce rôle
// a besoin. Les rôles dont le tableau dédié n'est pas encore livré retombent
// sur l'ancien tableau de bord unique.
const PAR_ROLE = {
  dir: DashboardDir,
  be: DashboardBe,
  prog: DashboardProg,
  prod: DashboardProd,
  ca: DashboardCa,
}

export default function Dashboard() {
  const role = useAuthStore((s) => s.user?.role)
  const Vue = PAR_ROLE[role] ?? DashboardLegacy
  return <Vue />
}

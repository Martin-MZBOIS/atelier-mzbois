import { useAuthStore } from '../store'
import DashboardLegacy from './DashboardLegacy'
import DashboardDir from './dashboard/DashboardDir'

// Chaque rôle a son propre tableau de bord : il n'affiche que ce dont ce rôle
// a besoin. Les rôles dont le tableau dédié n'est pas encore livré retombent
// sur l'ancien tableau de bord unique.
const PAR_ROLE = {
  dir: DashboardDir,
}

export default function Dashboard() {
  const role = useAuthStore((s) => s.user?.role)
  const Vue = PAR_ROLE[role] ?? DashboardLegacy
  return <Vue />
}

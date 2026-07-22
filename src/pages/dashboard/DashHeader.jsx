import { useAuthStore } from '../../store'
import { ROLES } from '../../lib/roles'

// En-tête d'accueil : on s'adresse à la personne, pas à son rôle.
// Le rôle reste affiché, mais en second — il situe sans occuper le premier plan.
export default function DashHeader() {
  const user = useAuthStore((s) => s.user)
  const role = user ? ROLES[user.role] : null

  const h = new Date().getHours()
  const salut = h < 18 ? 'Bonjour' : 'Bonsoir'
  const jour = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <header className="dash-head">
      <h1 className="dash-title">
        {salut} {user?.prenom ?? ''}
      </h1>
      <div className="dash-sub">
        <span className="dash-date">{jour}</span>
        {role && <span className="dash-role">{role.label}</span>}
      </div>
    </header>
  )
}

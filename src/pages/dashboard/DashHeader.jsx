import { useAuthStore } from '../../store'
import { ROLES } from '../../lib/roles'
import { useMeteo, wIcon, wLabel } from '../../lib/useMeteo'

// En-tête d'accueil : on s'adresse à la personne, pas à son rôle.
// Le rôle reste affiché, mais en second — il situe sans occuper le premier plan.
// La météo l'accompagne à droite : elle rend l'arrivée sur l'app plus
// accueillante, sans prétendre être un indicateur de pilotage.
export default function DashHeader() {
  const user = useAuthStore((s) => s.user)
  const role = user ? ROLES[user.role] : null
  const meteo = useMeteo()

  const h = new Date().getHours()
  const salut = h < 18 ? 'Bonjour' : 'Bonsoir'
  const jour = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const ok = meteo && !meteo.err

  return (
    <header className="dash-head">
      <div className="dash-head-txt">
        <h1 className="dash-title">
          {salut} {user?.prenom ?? ''}
        </h1>
        <div className="dash-sub">
          <span className="dash-date">{jour}</span>
          {role && <span className="dash-role">{role.label}</span>}
        </div>
      </div>

      {ok && (
        <div className="dash-meteo" title="Tarare / Lyon">
          <div className="dash-meteo-now">
            <span className="dash-meteo-ico">{wIcon(meteo.current.weathercode)}</span>
            <div>
              <div className="dash-meteo-temp">
                {Math.round(meteo.current.temperature_2m)}°
              </div>
              <div className="dash-meteo-lbl">{wLabel(meteo.current.weathercode)}</div>
            </div>
          </div>
          <div className="dash-meteo-days">
            {['Auj.', 'Dem.', 'J+2'].map((lbl, i) => (
              <div key={lbl} className="dash-meteo-day">
                <span className="dash-meteo-day-lbl">{lbl}</span>
                <span>{wIcon(meteo.daily.weathercode[i])}</span>
                <span className="dash-meteo-day-max">
                  {Math.round(meteo.daily.temperature_2m_max[i])}°
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}

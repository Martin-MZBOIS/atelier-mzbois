import { useNavigate } from 'react-router-dom'
import { daysUntil, formatLong, nextHommesCles, nextStrategie } from '../../lib/copil'
import { GEL } from '../../lib/gel'

function countdown(d) {
  if (d < 0) return 'passée'
  if (d === 0) return "aujourd'hui"
  return `dans ${d} jour${d > 1 ? 's' : ''}`
}

// Prochaines réunions COPIL + accès direct à la préparation de l'ordre du jour.
export default function CopilCard() {
  // La carte n'annonce que les deux réunions de pilotage : gelées, elle n'a
  // plus rien à dire. Sortie avant tout hook.
  if (GEL.copilPilotage) return null

  const navigate = useNavigate()
  const reunions = [
    { id: 'hommes_cles', label: '👥 Hommes clés', date: nextHommesCles() },
    { id: 'strategie', label: '📊 Stratégie', date: nextStrategie() },
  ]

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">📋 COPIL</span>
      </div>
      {reunions.map((r) => {
        const d = daysUntil(r.date)
        return (
          <div key={r.id} className="copil-mini">
            <div className="copil-mini-body">
              <div className="copil-mini-lbl">{r.label}</div>
              <div className="copil-mini-date" style={{ textTransform: 'capitalize' }}>
                {formatLong(r.date)}
              </div>
            </div>
            <span className="copil-mini-count">{countdown(d)}</span>
            <button
              className="btn bg bsm"
              onClick={() => navigate(`/copil?o=${r.id}`)}
            >
              Préparer l'OdJ →
            </button>
          </div>
        )
      })}
    </div>
  )
}

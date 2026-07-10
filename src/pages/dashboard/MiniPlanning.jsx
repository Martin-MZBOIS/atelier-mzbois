import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { CHANTIER_COLORS, JOURS5, isoDay, week5 } from '../../lib/dashboard'

// Mini planning de la semaine (lundi → vendredi).
// employes : liste des salariés à afficher (une ligne chacun).
export default function MiniPlanning({ employes = [], title = 'Planning cette semaine' }) {
  const navigate = useNavigate()
  const [affectations, setAffectations] = useState([])
  const days = useMemo(() => week5(), [])

  useEffect(() => {
    let active = true
    supabase
      .from('plan_affectations')
      .select('sal_id, chantier_id, date_debut, date_fin, chantier:chantiers!chantier_id(num)')
      .then(({ data }) => active && setAffectations(data ?? []))
    return () => {
      active = false
    }
  }, [])

  const chantierColor = useMemo(() => {
    const ids = [...new Set(affectations.map((a) => a.chantier_id))]
    const m = {}
    ids.forEach((id, i) => (m[id] = CHANTIER_COLORS[i % CHANTIER_COLORS.length]))
    return m
  }, [affectations])

  return (
    <div className="card dash-full">
      <div className="card-head">
        <span className="card-title">{title}</span>
        <button className="btn bg bsm" onClick={() => navigate('/planning')}>
          Voir tout →
        </button>
      </div>
      {employes.length === 0 ? (
        <div className="empty">Aucun salarié à afficher</div>
      ) : (
        <div className="mini-plan-scroll">
          <table className="mini-plan">
            <thead>
              <tr>
                <th></th>
                {days.map((d, i) => (
                  <th key={i}>
                    {JOURS5[i]} {d.getDate()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employes.map((emp) => (
                <tr key={emp.id}>
                  <td className="mini-plan-name">{emp.prenom}</td>
                  {days.map((d, i) => {
                    const iso = isoDay(d)
                    const affs = affectations.filter(
                      (a) => a.sal_id === emp.id && a.date_debut <= iso && a.date_fin >= iso
                    )
                    return (
                      <td key={i} className="mini-plan-cell">
                        {affs.map((a, j) => (
                          <div
                            key={j}
                            className="mini-plan-block"
                            style={{ background: chantierColor[a.chantier_id] }}
                          >
                            {(a.chantier?.num ?? '').split('-')[0]}
                          </div>
                        ))}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

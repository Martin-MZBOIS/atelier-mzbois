import { useNavigate } from 'react-router-dom'
import { CLOS } from '../../lib/dashboard'

// KPIs chantiers : actifs / à facturer / terminés.
// Un chantier est « terminé » si tous ses ouvrages le sont ; « à facturer » si,
// n'étant pas terminé, au moins un de ses ouvrages est au statut `termine`.
export default function KpiChantiers({ chantiers = [], ouvrages = [] }) {
  const navigate = useNavigate()

  const byChantier = {}
  for (const o of ouvrages) {
    const cid = o.chantier?.id ?? o.chantier_id
    if (!cid) continue
    ;(byChantier[cid] ??= []).push(o.statut)
  }

  let actifs = 0
  let aFacturer = 0
  let termines = 0
  for (const c of chantiers) {
    const statuts = byChantier[c.id] ?? []
    if (statuts.length === 0) continue
    const tousClos = statuts.every((s) => CLOS.includes(s))
    if (tousClos) termines += 1
    else {
      actifs += 1
      if (statuts.some((s) => s === 'termine')) aFacturer += 1
    }
  }

  const kpis = [
    { lbl: 'Actifs', val: actifs, color: '#4a6b8a' },
    { lbl: 'À facturer', val: aFacturer, color: '#8a7040' },
    { lbl: 'Terminés', val: termines, color: '#5a7a5a' },
  ]

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">📊 Chantiers</span>
        <button className="btn bg bsm" onClick={() => navigate('/chantiers')}>
          Voir tout →
        </button>
      </div>
      <div className="kpi-row">
        {kpis.map((k) => (
          <div key={k.lbl} className="kpi" style={{ borderTopColor: k.color }}>
            <div className="kpi-val" style={{ color: k.color }}>{k.val}</div>
            <div className="kpi-lbl">{k.lbl}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

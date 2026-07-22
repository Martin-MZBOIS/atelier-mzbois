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

  // Chaque indicateur porte sa propre teinte : la couleur sert de repère,
  // pas de décoration.
  const kpis = [
    { lbl: 'Chantiers actifs', val: actifs, ton: 'bleu' },
    { lbl: 'À facturer', val: aFacturer, ton: 'ocre' },
    { lbl: 'Terminés', val: termines, ton: 'vert' },
  ]

  return (
    <div className="kpi-row">
      {kpis.map((k) => (
        <button
          key={k.lbl}
          className={'kpi kpi--' + k.ton}
          onClick={() => navigate('/chantiers')}
          title="Voir les chantiers"
        >
          <span className="kpi-val">{k.val}</span>
          <span className="kpi-lbl">{k.lbl}</span>
        </button>
      ))}
    </div>
  )
}

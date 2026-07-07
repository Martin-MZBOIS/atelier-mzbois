import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate, formatEuro } from '../lib/format'
import {
  STATUT_OUVRAGE,
  STATUT_OUVRAGE_ORDER,
  resolve,
} from '../lib/statuts'

export default function OuvragesTab() {
  const { chantier } = useOutletContext()
  const [ouvrages, setOuvrages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const { data, error: dbError } = await supabase
        .from('ouvrages')
        .select(
          'id, nom, statut, notes, qty, dep, livraison, camion, pose, ' +
            'dp_pose, devis, sit_pct, fact_def, ' +
            'poseur:employes!poseur_id(prenom, nom)'
        )
        .eq('chantier_id', chantier.id)
        .order('nom', { ascending: true })
      if (!active) return
      if (dbError) {
        setError(dbError.message)
        setOuvrages([])
      } else {
        setOuvrages(data ?? [])
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [chantier.id])

  async function changeStatut(ouvrageId, newStatut) {
    const previous = ouvrages
    setSaving(ouvrageId)
    // Mise à jour optimiste
    setOuvrages((prev) =>
      prev.map((o) => (o.id === ouvrageId ? { ...o, statut: newStatut } : o))
    )
    const { error: dbError } = await supabase
      .from('ouvrages')
      .update({ statut: newStatut })
      .eq('id', ouvrageId)
    setSaving(null)
    if (dbError) {
      setOuvrages(previous) // rollback
      setError('Échec de la mise à jour du statut : ' + dbError.message)
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <span className="card-title">Ouvrages</span>
          <span className="card-count">{loading ? '' : ouvrages.length}</span>
        </div>
      </div>

      {loading && <p className="muted">Chargement…</p>}
      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}
      {!loading && !error && ouvrages.length === 0 && (
        <div className="empty">Aucun ouvrage</div>
      )}

      {ouvrages.map((o) => {
        const st = resolve(STATUT_OUVRAGE, o.statut)
        const qty = Number(o.qty)
        const devis = formatEuro(o.devis)
        return (
          <div
            key={o.id}
            className="ov"
            style={{ borderLeftColor: st.color }}
          >
            <div className="ov-main">
              <div className="ov-title-row">
                <span className="ov-title">{o.nom}</span>
                {qty > 1 && <span className="ov-qty">×{qty}</span>}
              </div>

              <div className="ov-meta">
                {o.dep && <span className="ov-dep">📅 {formatDate(o.dep)}</span>}
                {o.livraison && (
                  <span className="ov-liv">🚚 {formatDate(o.livraison)}</span>
                )}
                {o.camion && <span className="ov-cam">🚛 {o.camion}</span>}
                {o.pose && o.dp_pose && (
                  <span className="ov-pose">
                    🔧 Pose {formatDate(o.dp_pose)}
                    {o.poseur ? ' — ' + o.poseur.prenom : ''}
                  </span>
                )}
              </div>

              <div className="ov-badges">
                {devis && <span className="ov-tag">{devis}</span>}
                {o.sit_pct != null && (
                  <span className="ov-tag ov-tag--pct">{Number(o.sit_pct)}%</span>
                )}
                {o.fact_def && (
                  <span className="ov-tag ov-tag--fac">✓ Facturé</span>
                )}
              </div>

              {o.notes && <div className="ov-notes">{o.notes}</div>}
            </div>

            <div className="ov-side">
              <span className={'stbadge ' + st.cls}>
                <span
                  className="stdot"
                  style={{ backgroundColor: st.color }}
                />
                {st.label}
              </span>
              <select
                className="ss"
                value={o.statut ?? ''}
                disabled={saving === o.id}
                onChange={(e) => changeStatut(o.id, e.target.value)}
              >
                {o.statut == null && <option value="">—</option>}
                {STATUT_OUVRAGE_ORDER.map((slug) => (
                  <option key={slug} value={slug}>
                    {STATUT_OUVRAGE[slug].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )
      })}
    </div>
  )
}

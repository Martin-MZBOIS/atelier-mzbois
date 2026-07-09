import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../lib/format'

// Journal des modifications Admin d'un chantier (visible par le Dirigeant).
export default function HistoriqueTab() {
  const { chantier } = useOutletContext()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const { data, error: dbError } = await supabase
        .from('historique_modifications')
        .select('id, table_name, champ, ancienne_valeur, nouvelle_valeur, modifie_le, auteur:utilisateurs!modifie_par(prenom, nom)')
        .eq('chantier_id', chantier.id)
        .order('modifie_le', { ascending: false })
      if (!active) return
      if (dbError) setError(dbError.message)
      else setRows(data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [chantier.id])

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">🗂 Historique des modifications</span>
      </div>

      {loading && <p className="muted">Chargement…</p>}
      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
          {/historique_modifications/.test(error) && (
            <div className="alert-sub">
              Exécute la migration <code>0020_historique_et_seed_roles.sql</code>.
            </div>
          )}
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div className="empty">Aucune modification enregistrée.</div>
      )}

      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Champ</th>
                <th>Ancienne</th>
                <th>Nouvelle</th>
                <th>Par</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{formatDateTime(r.modifie_le)}</td>
                  <td>{r.champ}</td>
                  <td>{r.ancienne_valeur ?? '—'}</td>
                  <td className="strong">{r.nouvelle_valeur ?? '—'}</td>
                  <td>{r.auteur ? `${r.auteur.prenom} ${r.auteur.nom}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

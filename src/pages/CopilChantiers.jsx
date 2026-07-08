import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'

const RECENT_DAYS = 7 // réunion hebdomadaire → au-delà = plus récente

function daysSince(dateStr) {
  if (!dateStr) return Infinity
  return Math.floor((new Date() - new Date(dateStr + 'T00:00:00')) / 86400000)
}

// Onglet COPIL « Réunion de chantiers » — synthèse agrégée par chantier.
export default function CopilChantiers() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const [ch, reu] = await Promise.all([
        supabase
          .from('chantiers')
          .select('id, num, client, nom')
          .neq('num', 'STOCK')
          .order('num'),
        supabase
          .from('reunions')
          .select(
            'id, chantier_id, date, notes, ' +
              'reunion_actions(id, texte, done, ' +
              'employe:employes!assigne_a(prenom, nom))'
          )
          .order('date', { ascending: false }),
      ])
      if (!active) return
      if (ch.error || reu.error) {
        setError((ch.error || reu.error).message)
        setLoading(false)
        return
      }
      // Dernière réunion par chantier (les réunions sont triées date desc).
      const lastByChantier = {}
      for (const r of reu.data ?? []) {
        if (!lastByChantier[r.chantier_id]) lastByChantier[r.chantier_id] = r
      }
      const merged = (ch.data ?? []).map((c) => ({
        chantier: c,
        reunion: lastByChantier[c.id] ?? null,
      }))
      setRows(merged)
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div>
      <div className="copil-freq">
        Fréquence&nbsp;: tous les lundis. Synthèse automatique des dernières
        réunions par chantier.
      </div>

      {loading && <p className="muted">Chargement…</p>}
      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {!loading &&
        !error &&
        rows.map(({ chantier, reunion }) => {
          const age = reunion ? daysSince(reunion.date) : Infinity
          const staleChantier = !reunion || age > RECENT_DAYS
          const actions = reunion?.reunion_actions ?? []
          return (
            <div key={chantier.id} className="card copil-ch-card">
              <div className="card-head">
                <div>
                  <span className="card-title mono">{chantier.num}</span>
                  <span className="card-count">{chantier.client}</span>
                  {staleChantier && (
                    <span className="copil-stale">⚠ sans réunion récente</span>
                  )}
                </div>
                <button
                  className="btn bg bsm"
                  onClick={() => navigate(`/chantiers/${chantier.id}/reunion`)}
                >
                  + Nouvelle réunion de chantiers
                </button>
              </div>

              {reunion ? (
                <>
                  <div className="copil-reunion-line">
                    📋 Dernière réunion du <strong>{formatDate(reunion.date)}</strong>{' '}
                    <span className="muted">({age}j)</span>
                  </div>
                  {reunion.notes && (
                    <div className="copil-notes">{reunion.notes}</div>
                  )}
                  {actions.length > 0 ? (
                    <div className="copil-actions">
                      {actions.map((a) => {
                        const late = !a.done && age > RECENT_DAYS
                        return (
                          <div
                            key={a.id}
                            className={'copil-action' + (late ? ' copil-action--late' : '')}
                          >
                            <span className="copil-action-state">
                              {a.done ? '✅' : '❌'}
                            </span>
                            <span className="copil-action-text">{a.texte}</span>
                            {a.employe && (
                              <span className="copil-action-who">
                                👤 {a.employe.prenom}
                              </span>
                            )}
                            {late && <span className="copil-late-badge">en retard</span>}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="muted copil-empty-actions">Aucune action.</div>
                  )}
                </>
              ) : (
                <div className="muted">Aucune réunion enregistrée.</div>
              )}
            </div>
          )
        })}

      {!loading && !error && rows.length === 0 && (
        <div className="empty">Aucun chantier.</div>
      )}
    </div>
  )
}

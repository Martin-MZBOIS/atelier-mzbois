import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { SkelList } from '../components/Skeleton'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'
import { formatLong } from '../lib/copil'
import TrameGuide from '../components/TrameGuide'

const RECENT_DAYS = 7 // réunion hebdomadaire → au-delà = plus récente

function daysSince(dateStr) {
  if (!dateStr) return Infinity
  return Math.floor((new Date() - new Date(dateStr + 'T00:00:00')) / 86400000)
}

// Lundi de la semaine courante.
function thisMonday() {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

// Statut d'un chantier déduit de sa dernière réunion et de ses actions.
// « Bloqué » est réservé aux actions réellement en retard (non faites alors que
// la réunion date de plus d'une semaine) ; l'absence de réunion n'est pas un
// blocage, seulement un point d'attention.
function chantierStatut(reunion, age) {
  if (!reunion) return { label: 'Attention', color: '#8a7040' }
  const actions = reunion.reunion_actions ?? []
  const undone = actions.filter((a) => !a.done).length
  const stale = age > RECENT_DAYS
  if (undone > 0 && stale) return { label: 'Bloqué', color: '#8b3a3a' }
  if (undone > 0 || stale) return { label: 'Attention', color: '#8a7040' }
  return { label: 'On track', color: '#5a7a5a' }
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
          .select('id, num, client, nom, ca:utilisateurs!ca_id(prenom, nom)')
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
      <div className="copil-next">
        <div className="copil-next-lbl">Réunion de chantiers — Lundi</div>
        <div className="copil-next-date" style={{ textTransform: 'capitalize' }}>
          {formatLong(thisMonday())}
        </div>
        <div className="muted" style={{ marginTop: 4 }}>
          Synthèse des actions de la semaine précédente
        </div>
      </div>

      {loading && <SkelList rows={5} />}
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
          const statut = chantierStatut(reunion, age)
          return (
            <div key={chantier.id} className="card copil-ch-card">
              <div className="card-head">
                <div>
                  <span className="card-title mono">{chantier.num}</span>
                  <span className="card-count">{chantier.client}</span>
                  {chantier.ca && (
                    <span className="card-count">
                      · 👤 {chantier.ca.prenom} {chantier.ca.nom}
                    </span>
                  )}
                  <span
                    className="aspill"
                    style={{ color: statut.color, backgroundColor: statut.color + '22', marginLeft: 8 }}
                  >
                    {statut.label}
                  </span>
                  {staleChantier && (
                    <span className="copil-stale">⚠ sans réunion récente</span>
                  )}
                </div>
                <button
                  className="btn bg bsm"
                  onClick={() => navigate(`/chantiers/${chantier.id}/reunion`)}
                >
                  Ouvrir la réunion
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
        <EmptyState ico="🏗" titre="Aucun chantier" aide="La vue consolidée se remplira dès qu’un chantier sera ouvert." />
      )}

      {!loading && !error && (
        <div className="card">
          <TrameGuide type="reunion_chantiers" title="Trame de réunion" />
        </div>
      )}
    </div>
  )
}

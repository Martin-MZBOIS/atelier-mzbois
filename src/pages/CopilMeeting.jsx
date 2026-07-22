import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { SkelList } from '../components/Skeleton'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store'
import { formatDate } from '../lib/format'
import { daysUntil, formatLong, toIso } from '../lib/copil'
import SujetModal from './SujetModal'
import CopilReunionModal from './CopilReunionModal'
import TrameGuide from '../components/TrameGuide'

const SUJET_STATUT = {
  boite: { label: 'En attente', color: '#8a7040' },
  ordre_du_jour: { label: 'Sélectionné OdJ', color: '#4a6b8a' },
  traite: { label: 'Traité', color: '#5a7a5a' },
}

// Onglet COPIL réutilisable (Hommes clés / Stratégie).
export default function CopilMeeting({ type, freqLabel, nextDate, canSubmit, odjTemplate }) {
  const role = useAuthStore((s) => s.user?.role)
  const isDir = role === 'dir'
  const canSubmitSujet = canSubmit(role)

  const [sujets, setSujets] = useState([])
  const [reunions, setReunions] = useState([])
  const [employes, setEmployes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showSujet, setShowSujet] = useState(false)
  const [showCR, setShowCR] = useState(false)
  const [odjNotes, setOdjNotes] = useState('')
  const [manuel, setManuel] = useState('')

  async function load() {
    setError('')
    const [su, re, em] = await Promise.all([
      supabase
        .from('copil_sujets')
        .select('id, titre, description, date, statut, auteur:utilisateurs!soumis_par(prenom, nom)')
        .eq('type', type)
        .order('date', { ascending: false }),
      supabase
        .from('copil_reunions')
        .select('id, date, ordre_du_jour, notes, statut, copil_actions(id, texte, done, employe:employes!assigne_a(prenom))')
        .eq('type', type)
        .order('date', { ascending: false }),
      supabase.from('employes').select('id, prenom, nom').order('nom'),
    ])
    if (su.error || re.error) {
      setError((su.error || re.error).message)
      setLoading(false)
      return
    }
    setSujets(su.data ?? [])
    setReunions(re.data ?? [])
    setEmployes(em.data ?? [])
    const planif = (re.data ?? []).find((r) => r.statut === 'planifiee')
    setOdjNotes(planif?.ordre_du_jour ?? '')
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  const planifiee = reunions.find((r) => r.statut === 'planifiee')
  const faites = reunions.filter((r) => r.statut === 'faite')
  const boite = sujets.filter((s) => s.statut === 'boite')
  const odjSujets = sujets.filter((s) => s.statut === 'ordre_du_jour')
  const nextD = nextDate()

  async function moveToOdj(id) {
    await supabase.from('copil_sujets').update({ statut: 'ordre_du_jour' }).eq('id', id)
    await load()
  }
  async function createOdj() {
    await supabase
      .from('copil_reunions')
      .insert({ type, date: toIso(nextD), heure: type === 'hommes_cles' ? '11:00' : null, statut: 'planifiee' })
    await load()
  }
  async function saveOdjNotes() {
    if (!planifiee) return
    await supabase.from('copil_reunions').update({ ordre_du_jour: odjNotes }).eq('id', planifiee.id)
    await load()
  }
  async function addManuel() {
    if (!manuel.trim()) return
    await supabase.from('copil_sujets').insert({ type, titre: manuel.trim(), statut: 'ordre_du_jour' })
    setManuel('')
    await load()
  }

  if (loading) return <SkelList rows={5} />
  if (error)
    return (
      <div className="alert">
        <strong>Erreur :</strong> {error}
        {error.includes('copil_') && (
          <div className="alert-sub">
            Exécute la migration <code>supabase/migrations/0014_copil.sql</code>.
          </div>
        )}
      </div>
    )

  return (
    <div>
      <div className="copil-freq">Fréquence&nbsp;: {freqLabel}</div>

      {/* Prochaine réunion */}
      <div className="copil-next">
        <div className="copil-next-lbl">Prochaine réunion</div>
        <div className="copil-next-date">{formatLong(nextD)}</div>
        <div className="copil-next-countdown">
          {(() => {
            const d = daysUntil(nextD)
            if (d < 0) return 'Réunion passée'
            if (d === 0) return "Aujourd'hui"
            return `dans ${d} jour${d > 1 ? 's' : ''}`
          })()}
        </div>
        {isDir && !planifiee && (
          <button className="btn bp bsm" style={{ marginTop: 8 }} onClick={createOdj}>
            Préparer l'ordre du jour →
          </button>
        )}
      </div>

      {/* A) Boîte à idées */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">💡 Boîte à idées</span>
          {canSubmitSujet && (
            <button className="btn bp bsm" onClick={() => setShowSujet(true)}>
              + Soumettre un sujet
            </button>
          )}
        </div>
        {sujets.length === 0 ? (
          <EmptyState ico="💬" titre="Aucun sujet soumis" aide="Proposez un sujet pour qu’il rejoigne l’ordre du jour." />
        ) : (
          sujets.map((s) => {
            const st = SUJET_STATUT[s.statut] ?? SUJET_STATUT.boite
            return (
              <div key={s.id} className="copil-sujet">
                <div className="copil-sujet-main">
                  <div className="copil-sujet-titre">{s.titre}</div>
                  {s.description && <div className="copil-sujet-desc">{s.description}</div>}
                  <div className="copil-sujet-meta">
                    {s.auteur ? `${s.auteur.prenom} ${s.auteur.nom}` : '—'} · {formatDate(s.date)}
                  </div>
                </div>
                <span className="aspill" style={{ color: st.color, backgroundColor: st.color + '22' }}>
                  {st.label}
                </span>
                {isDir && s.statut === 'boite' && (
                  <button className="btn bg bxs" onClick={() => moveToOdj(s.id)}>
                    → OdJ
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* B) Ordre du jour */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">📌 Ordre du jour</span>
          {isDir && planifiee && (
            <button className="btn bp bsm" onClick={() => setShowCR(true)}>
              Clôturer (CR)
            </button>
          )}
        </div>

        {!planifiee ? (
          isDir ? (
            <div>
              <div className="muted" style={{ marginBottom: 8 }}>
                Aucun ordre du jour pour la prochaine réunion.
              </div>
              <button className="btn bp bsm" onClick={createOdj}>
                Créer l'ordre du jour
              </button>
            </div>
          ) : (
            <EmptyState ico="📋" titre="Ordre du jour pas encore publié" aide="Il apparaîtra ici une fois la trame validée." />
          )
        ) : (
          <>
            {odjSujets.length > 0 ? (
              odjSujets.map((s) => (
                <div key={s.id} className="copil-sujet">
                  <div className="copil-sujet-main">
                    <div className="copil-sujet-titre">{s.titre}</div>
                    {s.description && <div className="copil-sujet-desc">{s.description}</div>}
                  </div>
                </div>
              ))
            ) : (
              <div className="muted" style={{ marginBottom: 8 }}>
                Aucun sujet sélectionné pour l'ordre du jour.
              </div>
            )}

            {isDir ? (
              <>
                <div className="fl" style={{ marginTop: 10 }}>
                  <label>Notes / ordre du jour</label>
                  <textarea
                    className="ni"
                    rows="4"
                    value={odjNotes}
                    onChange={(e) => setOdjNotes(e.target.value)}
                  />
                </div>
                <div className="param-add">
                  <input
                    value={manuel}
                    placeholder="Ajouter un point manuellement…"
                    onChange={(e) => setManuel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addManuel()}
                  />
                  <button className="btn bg bsm" onClick={addManuel}>+ Point</button>
                  <button className="btn bp bsm" onClick={saveOdjNotes}>Enregistrer</button>
                </div>
              </>
            ) : (
              odjNotes && <div className="copil-notes">{odjNotes}</div>
            )}
          </>
        )}
      </div>

      {/* C) Trame de réunion (guide, toujours visible) */}
      <div className="card">
        <TrameGuide type={type} />
      </div>

      {/* D) Historique */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">📚 Historique des réunions</span>
        </div>
        {faites.length === 0 ? (
          <EmptyState ico="🗓" titre="Aucune réunion passée" aide="Les comptes-rendus s’archivent ici après chaque COPIL." />
        ) : (
          faites.map((r) => (
            <div key={r.id} className="reunion">
              <div className="reunion-head">
                <div className="reunion-title">📋 Réunion du {formatDate(r.date)}</div>
              </div>
              {r.notes && <div className="reunion-notes">{r.notes}</div>}
              {(r.copil_actions ?? []).length > 0 && (
                <div className="copil-actions">
                  {r.copil_actions.map((a) => (
                    <div key={a.id} className="copil-action">
                      <span className="copil-action-state">{a.done ? '✅' : '❌'}</span>
                      <span className="copil-action-text">{a.texte}</span>
                      {a.employe && <span className="copil-action-who">👤 {a.employe.prenom}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showSujet && (
        <SujetModal
          type={type}
          onClose={() => setShowSujet(false)}
          onSaved={async () => {
            setShowSujet(false)
            await load()
          }}
        />
      )}
      {showCR && (
        <CopilReunionModal
          type={type}
          reunionId={planifiee?.id}
          date={nextD}
          odjSujetIds={odjSujets.map((s) => s.id)}
          employes={employes}
          onClose={() => setShowCR(false)}
          onSaved={async () => {
            setShowCR(false)
            await load()
          }}
        />
      )}
    </div>
  )
}

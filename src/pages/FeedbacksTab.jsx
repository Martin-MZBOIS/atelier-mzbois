import { useEffect, useState } from 'react'
import SelectSearch from '../components/SelectSearch'
import EmptyState from '../components/EmptyState'
import { SkelList } from '../components/Skeleton'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../lib/format'
import {
  STATUT_FEEDBACK,
  STATUT_FEEDBACK_ORDER,
  resolve,
} from '../lib/statuts'
import FeedbackModal from './FeedbackModal'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function FeedbacksTab() {
  const { chantier } = useOutletContext()
  const [feedbacks, setFeedbacks] = useState([])
  const [ouvrages, setOuvrages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [solving, setSolving] = useState(null) // feedbackId en cours de résolution
  const [solutionText, setSolutionText] = useState('')

  async function loadFeedbacks() {
    const { data, error: dbError } = await supabase
      .from('feedbacks')
      .select(
        'id, description, statut, solution, date, date_solution, ' +
          'ouvrage:ouvrages!ouvrage_id(nom), ' +
          'auteur:utilisateurs!saisi_par(prenom, nom)'
      )
      .eq('chantier_id', chantier.id)
      .order('date', { ascending: false })
    if (dbError) {
      setError(dbError.message)
      setFeedbacks([])
    } else {
      setFeedbacks(data ?? [])
    }
  }

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const [, ov] = await Promise.all([
        loadFeedbacks(),
        supabase
          .from('ouvrages')
          .select('id, nom')
          .eq('chantier_id', chantier.id)
          .order('nom'),
      ])
      if (!active) return
      setOuvrages(ov.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantier.id])

  async function changeStatut(id, newStatut) {
    const previous = feedbacks
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === id ? { ...f, statut: newStatut } : f))
    )
    const { error: dbError } = await supabase
      .from('feedbacks')
      .update({ statut: newStatut })
      .eq('id', id)
    if (dbError) {
      setFeedbacks(previous)
      setError('Échec de la mise à jour : ' + dbError.message)
    }
  }

  async function confirmSolve(id) {
    if (!solutionText.trim()) return
    const { error: dbError } = await supabase
      .from('feedbacks')
      .update({
        statut: 'resolu',
        solution: solutionText.trim(),
        date_solution: today(),
      })
      .eq('id', id)
    if (dbError) {
      setError('Échec : ' + dbError.message)
      return
    }
    setSolving(null)
    setSolutionText('')
    await loadFeedbacks()
  }

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Feedbacks atelier</span>
        <button className="btn bp bsm" onClick={() => setShowModal(true)}>
          + Feedback
        </button>
      </div>

      {loading && <SkelList rows={4} />}
      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}
      {!loading && !error && feedbacks.length === 0 && (
        <EmptyState ico="🔧" titre="Aucun feedback" aide="L’atelier peut remonter ici ce qui a posé problème en production." />
      )}

      {feedbacks.map((fb) => {
        const st = resolve(STATUT_FEEDBACK, fb.statut)
        return (
          <div key={fb.id} className={'fb ' + st.cls}>
            <div className="fb-head">
              <div>
                <div className="fb-desc">{fb.description}</div>
                {fb.ouvrage && (
                  <div className="fb-ouvrage">↳ {fb.ouvrage.nom}</div>
                )}
              </div>
              <div className="fb-status">
                <span
                  className="aspill"
                  style={{ color: st.color, backgroundColor: st.color + '22' }}
                >
                  {st.label}
                </span>
                <SelectSearch
                  className="ss"
                  value={fb.statut ?? ''}
                  onChange={(v) => changeStatut(fb.id, v)}
                  allowEmpty={fb.statut == null}
                  options={STATUT_FEEDBACK_ORDER.map((slug) => ({
                    value: slug,
                    label: STATUT_FEEDBACK[slug].label,
                  }))}
                />
              </div>
            </div>

            <div className="fb-meta">
              {fb.auteur ? `${fb.auteur.prenom} ${fb.auteur.nom}` : '—'} ·{' '}
              {formatDateTime(fb.date)}
            </div>

            {fb.solution && (
              <div className="fb-solution">✓ {fb.solution}</div>
            )}

            {fb.statut !== 'resolu' &&
              (solving === fb.id ? (
                <div className="fb-solve">
                  <textarea
                    className="ni"
                    rows="2"
                    placeholder="Solution apportée…"
                    value={solutionText}
                    onChange={(e) => setSolutionText(e.target.value)}
                  />
                  <div className="fb-solve-actions">
                    <button
                      className="btn bp bsm"
                      onClick={() => confirmSolve(fb.id)}
                    >
                      Valider la solution
                    </button>
                    <button
                      className="btn bg bsm"
                      onClick={() => {
                        setSolving(null)
                        setSolutionText('')
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn bg bsm fb-resolve-btn"
                  onClick={() => {
                    setSolving(fb.id)
                    setSolutionText('')
                  }}
                >
                  Marquer résolu
                </button>
              ))}
          </div>
        )
      })}

      {showModal && (
        <FeedbackModal
          chantierId={chantier.id}
          ouvrages={ouvrages}
          onClose={() => setShowModal(false)}
          onSaved={async () => {
            setShowModal(false)
            await loadFeedbacks()
          }}
        />
      )}
    </div>
  )
}

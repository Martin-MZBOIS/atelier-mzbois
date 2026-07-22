import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { SkelList } from '../components/Skeleton'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'
import { STATUT_REUNION, resolve } from '../lib/statuts'
import { toast } from '../store/toasts'
import ReunionModal from './ReunionModal'

export default function ReunionTab() {
  const { chantier } = useOutletContext()
  const [reunions, setReunions] = useState([])
  const [employes, setEmployes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editReunion, setEditReunion] = useState(null)

  async function loadReunions() {
    const { data, error: dbError } = await supabase
      .from('reunions')
      .select(
        'id, date, statut, notes, ' +
          'reunion_actions(id, texte, done, assigne_a, ' +
          'employe:employes!assigne_a(prenom, nom))'
      )
      .eq('chantier_id', chantier.id)
      .order('date', { ascending: false })
    if (dbError) {
      setError(dbError.message)
      setReunions([])
    } else {
      setReunions(data ?? [])
    }
  }

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const [, emp] = await Promise.all([
        loadReunions(),
        supabase.from('employes').select('id, prenom, nom').order('nom'),
      ])
      if (!active) return
      setEmployes(emp.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantier.id])

  async function toggleAction(actionId, current) {
    const previous = reunions
    setReunions((prev) =>
      prev.map((r) => ({
        ...r,
        reunion_actions: r.reunion_actions.map((a) =>
          a.id === actionId ? { ...a, done: !current } : a
        ),
      }))
    )
    const { error: dbError } = await supabase
      .from('reunion_actions')
      .update({ done: !current })
      .eq('id', actionId)
    if (dbError) {
      setReunions(previous)
      setError('Échec de la mise à jour : ' + dbError.message)
    }
  }

  // Suppression d'un compte-rendu. Les actions partent avec lui : on annonce
  // combien, parce qu'une action encore ouverte alimente les alertes du COPIL.
  async function supprimerReunion(r) {
    const actions = r.reunion_actions ?? []
    const detail = actions.length
      ? `\n\nSes ${actions.length} action${actions.length > 1 ? 's' : ''} seront supprimées avec lui.`
      : ''
    const ok = window.confirm(
      `Supprimer définitivement le compte-rendu du ${formatDate(r.date)} ?${detail}`
    )
    if (!ok) return
    const { error: dbError } = await supabase.from('reunions').delete().eq('id', r.id)
    if (dbError) {
      setError('Suppression impossible : ' + dbError.message)
      toast.error('Compte-rendu non supprimé')
      return
    }
    toast('Compte-rendu du ' + formatDate(r.date) + ' supprimé')
    await loadReunions()
  }

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Réunions de chantiers (lundi)</span>
        <button className="btn bp bsm" onClick={() => setShowModal(true)}>
          + Ajouter CR
        </button>
      </div>

      {loading && <SkelList rows={4} />}
      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}
      {!loading && !error && reunions.length === 0 && (
        <EmptyState ico="📝" titre="Aucun compte-rendu" aide="Les comptes-rendus de réunion de chantier s’ajouteront ici." />
      )}

      {reunions.map((r) => {
        const st = resolve(STATUT_REUNION, r.statut)
        const actions = r.reunion_actions ?? []
        return (
          <div key={r.id} className="reunion">
            <div className="reunion-head">
              <div
                className="reunion-title reunion-title--click"
                onClick={() => setEditReunion(r)}
                title="Modifier le compte-rendu"
              >
                📋 Réunion de chantiers du {formatDate(r.date)}
              </div>
              {r.statut && (
                <span
                  className="aspill"
                  style={{ color: st.color, backgroundColor: st.color + '22' }}
                >
                  {st.label}
                </span>
              )}
              <button
                className="reunion-del"
                title="Supprimer ce compte-rendu"
                aria-label={'Supprimer le compte-rendu du ' + formatDate(r.date)}
                onClick={() => supprimerReunion(r)}
              >
                ✕
              </button>
            </div>

            {r.notes && <div className="reunion-notes">{r.notes}</div>}

            {actions.length > 0 && (
              <>
                <div className="sl">Actions</div>
                {actions.map((a) => (
                  <div key={a.id} className="action-item">
                    <input
                      type="checkbox"
                      checked={a.done}
                      onChange={() => toggleAction(a.id, a.done)}
                    />
                    <span className={'action-text' + (a.done ? ' done' : '')}>
                      {a.texte}
                    </span>
                    {a.employe && (
                      <span className="action-assignee">
                        👤 {a.employe.prenom}
                      </span>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )
      })}

      {showModal && (
        <ReunionModal
          chantierId={chantier.id}
          employes={employes}
          onClose={() => setShowModal(false)}
          onSaved={async () => {
            setShowModal(false)
            await loadReunions()
          }}
        />
      )}
      {editReunion && (
        <ReunionModal
          chantierId={chantier.id}
          reunion={editReunion}
          employes={employes}
          onClose={() => setEditReunion(null)}
          onSaved={async () => {
            setEditReunion(null)
            await loadReunions()
          }}
        />
      )}
    </div>
  )
}

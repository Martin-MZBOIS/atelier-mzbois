import { useState } from 'react'
import { raccourcisModal } from '../lib/clavier'
import { supabase } from '../lib/supabase'
import { toIso } from '../lib/copil'

// Clôture d'une réunion COPIL : crée (ou met à jour) une réunion « faite »,
// ses actions, alimente les tâches et marque les sujets de l'OdJ « traité ».
export default function CopilReunionModal({
  type,
  reunionId, // réunion planifiée à clôturer (sinon création)
  date,
  odjSujetIds = [],
  employes,
  onClose,
  onSaved,
}) {
  const [notes, setNotes] = useState('')
  const [actions, setActions] = useState([{ texte: '', assigne_a: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function setAction(i, key, value) {
    setActions((arr) => arr.map((a, idx) => (idx === i ? { ...a, [key]: value } : a)))
  }
  function addAction() {
    setActions((arr) => [...arr, { texte: '', assigne_a: '' }])
  }
  function removeAction(i) {
    setActions((arr) => arr.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    // 1. Réunion (mise à jour de la planifiée ou création d'une « faite »).
    let rid = reunionId
    if (rid) {
      const { error: uErr } = await supabase
        .from('copil_reunions')
        .update({ statut: 'faite', notes: notes.trim() || null })
        .eq('id', rid)
      if (uErr) return fail(uErr)
    } else {
      const { data, error: iErr } = await supabase
        .from('copil_reunions')
        .insert({
          type,
          date: date ? toIso(date) : null,
          statut: 'faite',
          notes: notes.trim() || null,
        })
        .select('id')
        .single()
      if (iErr) return fail(iErr)
      rid = data.id
    }

    // 2. Actions + tâches associées.
    const valid = actions.filter((a) => a.texte.trim())
    if (valid.length) {
      const { error: aErr } = await supabase.from('copil_actions').insert(
        valid.map((a) => ({
          reunion_id: rid,
          texte: a.texte.trim(),
          assigne_a: a.assigne_a || null,
          done: false,
        }))
      )
      if (aErr) return fail(aErr)

      const { error: tErr } = await supabase.from('taches').insert(
        valid.map((a) => ({
          texte: a.texte.trim(),
          done: false,
          assigne_a: a.assigne_a || null,
          source: 'copil_' + type,
        }))
      )
      if (tErr) return fail(tErr)
    }

    // 3. Sujets de l'ordre du jour → traités.
    if (odjSujetIds.length) {
      await supabase
        .from('copil_sujets')
        .update({ statut: 'traite' })
        .in('id', odjSujetIds)
    }

    setSaving(false)
    onSaved()

    function fail(e) {
      setSaving(false)
      setError(e.message)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={raccourcisModal(handleSave, onClose, saving)}
      >
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="modal-title">Compte-rendu de réunion</div>

        <div className="fl">
          <label>Notes</label>
          <textarea
            className="ni"
            rows="4"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="sl">Actions (→ tâches)</div>
        {actions.map((a, i) => (
          <div key={i} className="action-row">
            <input
              placeholder="Action…"
              value={a.texte}
              onChange={(e) => setAction(i, 'texte', e.target.value)}
            />
            <select value={a.assigne_a} onChange={(e) => setAction(i, 'assigne_a', e.target.value)}>
              <option value="">Assigner…</option>
              {employes.map((em) => (
                <option key={em.id} value={em.id}>
                  {em.prenom} {em.nom}
                </option>
              ))}
            </select>
            <button className="btn bg bsm" onClick={() => removeAction(i)} disabled={actions.length === 1}>
              ×
            </button>
          </div>
        ))}
        <button className="link-btn" onClick={addAction}>
          + Ajouter une action
        </button>

        {error && <div className="alert">{error}</div>}

        <div className="modal-actions">
          <button className="btn bp" disabled={saving} onClick={handleSave}>
            {saving ? 'Enregistrement…' : 'Clôturer la réunion'}
          </button>
          <button className="btn bg" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

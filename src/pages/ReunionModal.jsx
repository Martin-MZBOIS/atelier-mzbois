import { useState } from 'react'
import { supabase } from '../lib/supabase'

function today() {
  return new Date().toISOString().slice(0, 10)
}

// Modal de création d'un compte-rendu de réunion.
// Les actions saisies créent aussi des tâches (source « reunion »).
export default function ReunionModal({ chantierId, employes, onClose, onSaved }) {
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState('')
  const [actions, setActions] = useState([{ texte: '', assigne_a: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function setAction(i, key, value) {
    setActions((arr) =>
      arr.map((a, idx) => (idx === i ? { ...a, [key]: value } : a))
    )
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

    // 1. Réunion
    const { data: reunion, error: rErr } = await supabase
      .from('reunions')
      .insert({ chantier_id: chantierId, date, notes: notes.trim() || null })
      .select('id')
      .single()
    if (rErr) {
      setError(rErr.message)
      setSaving(false)
      return
    }

    // 2. Actions + tâches associées
    const validActions = actions.filter((a) => a.texte.trim())
    if (validActions.length) {
      const actionRows = validActions.map((a) => ({
        reunion_id: reunion.id,
        texte: a.texte.trim(),
        assigne_a: a.assigne_a || null,
        done: false,
      }))
      const { error: aErr } = await supabase
        .from('reunion_actions')
        .insert(actionRows)
      if (aErr) {
        setError('Réunion créée mais actions en échec : ' + aErr.message)
        setSaving(false)
        return
      }

      // Chaque action génère une tâche
      const taskRows = validActions.map((a) => ({
        texte: a.texte.trim(),
        done: false,
        chantier_id: chantierId,
        assigne_a: a.assigne_a || null,
        source: 'reunion',
      }))
      const { error: tErr } = await supabase.from('taches').insert(taskRows)
      if (tErr) {
        setError('Actions créées mais tâches en échec : ' + tErr.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="modal-title">Nouveau compte-rendu</div>

        <div className="fl">
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="fl">
          <label>Notes</label>
          <textarea
            className="ni"
            rows="3"
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
            <select
              value={a.assigne_a}
              onChange={(e) => setAction(i, 'assigne_a', e.target.value)}
            >
              <option value="">Assigner…</option>
              {employes.map((em) => (
                <option key={em.id} value={em.id}>
                  {em.prenom} {em.nom}
                </option>
              ))}
            </select>
            <button
              className="btn bg bsm"
              onClick={() => removeAction(i)}
              disabled={actions.length === 1}
            >
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
            {saving ? 'Enregistrement…' : 'Créer le CR'}
          </button>
          <button className="btn bg" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

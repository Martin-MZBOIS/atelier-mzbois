import { useState } from 'react'
import SelectSearch from '../components/SelectSearch'
import { raccourcisModal } from '../lib/clavier'
import { supabase } from '../lib/supabase'

function today() {
  return new Date().toISOString().slice(0, 10)
}

// Modal de création / édition d'un compte-rendu de réunion.
// Les nouvelles actions créent aussi des tâches (source « reunion »).
export default function ReunionModal({ chantierId, reunion, employes, onClose, onSaved }) {
  const isEdit = !!reunion
  const [date, setDate] = useState(reunion?.date ?? today())
  const [notes, setNotes] = useState(reunion?.notes ?? '')
  const [actions, setActions] = useState(
    reunion?.reunion_actions?.length
      ? reunion.reunion_actions.map((a) => ({ id: a.id, texte: a.texte, assigne_a: a.assigne_a ?? '' }))
      : [{ texte: '', assigne_a: '' }]
  )
  // Ids des actions initiales — pour détecter les suppressions en édition.
  const [initialIds] = useState((reunion?.reunion_actions ?? []).map((a) => a.id))
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

    // 1. Réunion (update si édition, insert sinon).
    let reunionId = reunion?.id
    if (isEdit) {
      const { error: rErr } = await supabase
        .from('reunions')
        .update({ date, notes: notes.trim() || null })
        .eq('id', reunionId)
      if (rErr) return fail(rErr.message)
    } else {
      const { data, error: rErr } = await supabase
        .from('reunions')
        .insert({ chantier_id: chantierId, date, notes: notes.trim() || null })
        .select('id')
        .single()
      if (rErr) return fail(rErr.message)
      reunionId = data.id
    }

    // 2. Actions : mise à jour des existantes, insertion des nouvelles, suppression des retirées.
    const valid = actions.filter((a) => a.texte.trim())
    const keptIds = valid.filter((a) => a.id).map((a) => a.id)
    const removed = initialIds.filter((id) => !keptIds.includes(id))
    if (removed.length) {
      await supabase.from('reunion_actions').delete().in('id', removed)
    }
    for (const a of valid.filter((a) => a.id)) {
      await supabase
        .from('reunion_actions')
        .update({ texte: a.texte.trim(), assigne_a: a.assigne_a || null })
        .eq('id', a.id)
    }
    const news = valid.filter((a) => !a.id)
    if (news.length) {
      const { error: aErr } = await supabase.from('reunion_actions').insert(
        news.map((a) => ({
          reunion_id: reunionId,
          texte: a.texte.trim(),
          assigne_a: a.assigne_a || null,
          done: false,
        }))
      )
      if (aErr) return fail('Réunion enregistrée mais actions en échec : ' + aErr.message)

      const { error: tErr } = await supabase.from('taches').insert(
        news.map((a) => ({
          texte: a.texte.trim(),
          done: false,
          chantier_id: chantierId ?? reunion?.chantier_id ?? null,
          assigne_a: a.assigne_a || null,
          source: 'reunion',
        }))
      )
      if (tErr) return fail('Actions créées mais tâches en échec : ' + tErr.message)
    }

    setSaving(false)
    onSaved()

    function fail(msg) {
      setError(msg)
      setSaving(false)
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
        <div className="modal-title">{isEdit ? 'Modifier le compte-rendu' : 'Nouveau compte-rendu'}</div>

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
            <SelectSearch
              value={a.assigne_a}
              onChange={(v) => setAction(i, 'assigne_a', v)}
              options={employes.map((em) => ({ value: em.id, label: em.prenom + ' ' + em.nom }))}
              allowEmpty
              emptyLabel="Assigner…"
            />
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
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le CR'}
          </button>
          <button className="btn bg" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

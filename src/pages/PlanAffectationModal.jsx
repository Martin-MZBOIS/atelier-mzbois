import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { PHASE_PLANNING } from '../lib/statuts'

const PHASE_ORDER = ['etude', 'fabrication', 'pose']

// Création d'une affectation de planning (salarié -> chantier sur une période).
export default function PlanAffectationModal({
  salarie,
  chantiers,
  initialDate,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    chantier_id: '',
    phase: 'fabrication',
    date_debut: initialDate ?? '',
    date_fin: initialDate ?? '',
    commentaire: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.chantier_id) {
      setError('Le chantier est obligatoire.')
      return
    }
    if (!form.date_debut || !form.date_fin) {
      setError('Les dates de début et de fin sont obligatoires.')
      return
    }
    if (form.date_fin < form.date_debut) {
      setError('La date de fin doit être après la date de début.')
      return
    }
    setSaving(true)
    setError('')
    const { error: dbError } = await supabase.from('plan_affectations').insert({
      chantier_id: form.chantier_id,
      phase: form.phase || null,
      sal_id: salarie.id,
      date_debut: form.date_debut,
      date_fin: form.date_fin,
      commentaire: form.commentaire.trim() || null,
    })
    setSaving(false)
    if (dbError) {
      setError(dbError.message)
      return
    }
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="modal-title">
          Affecter — {salarie.prenom} {salarie.nom}
        </div>

        <div className="fl">
          <label>Chantier *</label>
          <select value={form.chantier_id} onChange={(e) => set('chantier_id', e.target.value)} autoFocus>
            <option value="">—</option>
            {chantiers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.num} · {c.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="fl">
          <label>Phase</label>
          <select value={form.phase} onChange={(e) => set('phase', e.target.value)}>
            {PHASE_ORDER.map((slug) => (
              <option key={slug} value={slug}>
                {PHASE_PLANNING[slug].label}
              </option>
            ))}
          </select>
        </div>

        <div className="fg">
          <div className="fl">
            <label>Début *</label>
            <input type="date" value={form.date_debut} onChange={(e) => set('date_debut', e.target.value)} />
          </div>
          <div className="fl">
            <label>Fin *</label>
            <input type="date" value={form.date_fin} onChange={(e) => set('date_fin', e.target.value)} />
          </div>
        </div>

        <div className="fl">
          <label>Commentaire</label>
          <input value={form.commentaire} onChange={(e) => set('commentaire', e.target.value)} />
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-actions">
          <button className="btn bp" disabled={saving} onClick={handleSave}>
            {saving ? 'Enregistrement…' : 'Affecter'}
          </button>
          <button className="btn bg" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

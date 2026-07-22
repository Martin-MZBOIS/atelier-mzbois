import { useState } from 'react'
import SelectSearch from '../components/SelectSearch'
import { raccourcisModal } from '../lib/clavier'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store'

// Modal de création d'un feedback atelier.
export default function FeedbackModal({ chantierId, ouvrages, onClose, onSaved }) {
  const user = useAuthStore((s) => s.user)
  const [description, setDescription] = useState('')
  const [ouvrageId, setOuvrageId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!description.trim()) {
      setError('La description est obligatoire.')
      return
    }
    setSaving(true)
    setError('')
    const { error: dbError } = await supabase.from('feedbacks').insert({
      chantier_id: chantierId,
      ouvrage_id: ouvrageId || null,
      description: description.trim(),
      saisi_par: user?.id ?? null,
      statut: 'remonte',
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
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={raccourcisModal(handleSave, onClose, saving)}
      >
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="modal-title">Nouveau feedback</div>

        <div className="fl">
          <label>Description *</label>
          <textarea
            className="ni"
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoFocus
          />
        </div>

        <div className="fl">
          <label>Ouvrage concerné</label>
          <SelectSearch
            value={ouvrageId}
            onChange={setOuvrageId}
            options={ouvrages.map((o) => ({ value: o.id, label: o.nom }))}
            allowEmpty
          />
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-actions">
          <button className="btn bp" disabled={saving} onClick={handleSave}>
            {saving ? 'Enregistrement…' : 'Créer'}
          </button>
          <button className="btn bg" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

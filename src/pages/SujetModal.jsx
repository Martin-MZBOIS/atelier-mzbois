import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store'

// Soumission d'un sujet à la boîte à idées d'un COPIL (hommes_cles / strategie).
export default function SujetModal({ type, onClose, onSaved }) {
  const user = useAuthStore((s) => s.user)
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!titre.trim()) {
      setError('Le titre est obligatoire.')
      return
    }
    setSaving(true)
    setError('')
    const { error: dbError } = await supabase.from('copil_sujets').insert({
      type,
      titre: titre.trim(),
      description: description.trim() || null,
      soumis_par: user?.id ?? null,
      statut: 'boite',
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
        <div className="modal-title">Soumettre un sujet</div>

        <div className="fl">
          <label>Titre *</label>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} autoFocus />
        </div>
        <div className="fl">
          <label>Description</label>
          <textarea
            className="ni"
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-actions">
          <button className="btn bp" disabled={saving} onClick={handleSave}>
            {saving ? 'Envoi…' : 'Soumettre'}
          </button>
          <button className="btn bg" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

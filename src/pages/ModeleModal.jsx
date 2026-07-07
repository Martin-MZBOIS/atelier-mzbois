import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { TYP_ACHAT, TYP_ACHAT_ORDER } from '../lib/statuts'

// Création / édition d'un ouvrage modèle.
export default function ModeleModal({ modele, onClose, onSaved }) {
  const isEdit = Boolean(modele)
  const [form, setForm] = useState({
    nom: modele?.nom ?? '',
    description: modele?.description ?? '',
  })
  const [typs, setTyps] = useState(() => modele?.typs ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function toggleTyp(slug) {
    setTyps((prev) => (prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug]))
  }

  async function handleSave() {
    if (!form.nom.trim()) {
      setError('Le nom est obligatoire.')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      nom: form.nom.trim(),
      description: form.description.trim() || null,
      typs,
    }
    const query = isEdit
      ? supabase.from('ouvrage_modeles').update(payload).eq('id', modele.id)
      : supabase.from('ouvrage_modeles').insert(payload)
    const { error: dbError } = await query
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
        <div className="modal-title">{isEdit ? 'Modifier le modèle' : 'Nouvel ouvrage modèle'}</div>

        <div className="fl">
          <label>Nom *</label>
          <input value={form.nom} onChange={(e) => set('nom', e.target.value)} autoFocus />
        </div>

        <div className="fl">
          <label>Description</label>
          <input value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div className="sl">Typologies</div>
        <div className="checkbox-grid">
          {TYP_ACHAT_ORDER.map((slug) => (
            <label key={slug} className="checkbox-label">
              <input type="checkbox" checked={typs.includes(slug)} onChange={() => toggleTyp(slug)} />
              {TYP_ACHAT[slug].label}
            </label>
          ))}
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-actions">
          <button className="btn bp" disabled={saving} onClick={handleSave}>
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
          </button>
          <button className="btn bg" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

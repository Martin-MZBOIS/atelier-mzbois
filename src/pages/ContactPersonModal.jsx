import { useState } from 'react'
import SelectSearch from '../components/SelectSearch'
import { raccourcisModal } from '../lib/clavier'
import { supabase } from '../lib/supabase'

const ROLES = [
  'Dirigeant',
  'Commercial',
  'Livraison',
  'Commande',
  'SAV Technique',
  "Chargé d'affaire",
  'Autre',
]

// Ajout d'un contact (personne) à une fiche société.
export default function ContactPersonModal({ fournisseurId, onClose, onSaved }) {
  const [form, setForm] = useState({ nom: '', role: 'Commercial', tel: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.nom.trim()) {
      setError('Le nom est obligatoire.')
      return
    }
    setSaving(true)
    setError('')
    const { error: dbError } = await supabase.from('contacts').insert({
      fournisseur_id: fournisseurId,
      nom: form.nom.trim(),
      role: form.role || null,
      tel: form.tel.trim() || null,
      email: form.email.trim() || null,
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
        <div className="modal-title">Nouveau contact</div>

        <div className="fg">
          <div className="fl">
            <label>Nom *</label>
            <input value={form.nom} onChange={(e) => set('nom', e.target.value)} autoFocus />
          </div>
          <div className="fl">
            <label>Rôle</label>
            <SelectSearch
              value={form.role}
              onChange={(v) => set('role', v)}
              options={ROLES.map((r) => ({ value: r, label: r }))}
            />
          </div>
        </div>

        <div className="fg">
          <div className="fl">
            <label>Téléphone</label>
            <input value={form.tel} onChange={(e) => set('tel', e.target.value)} />
          </div>
          <div className="fl">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-actions">
          <button className="btn bp" disabled={saving} onClick={handleSave}>
            {saving ? 'Enregistrement…' : 'Ajouter'}
          </button>
          <button className="btn bg" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

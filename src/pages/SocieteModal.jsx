import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { TYPE_SOCIETE } from '../lib/statuts'

const TYPE_ORDER = ['fournisseur', 'client', 'sous_traitant', 'transporteur']

// Création d'une fiche société (fournisseur / client / sous-traitant / transporteur).
export default function SocieteModal({ defaultType, onClose, onSaved }) {
  const [form, setForm] = useState({
    nom: '',
    adresse: '',
    famille: '',
    site_web: '',
    type: defaultType ?? 'fournisseur',
  })
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
    const base = {
      nom: form.nom.trim(),
      adresse: form.adresse.trim() || null,
      famille: form.famille.trim() || null,
      type: form.type,
    }
    // Tente avec site_web ; repli sans si la colonne n'existe pas (migration 0010).
    let { data, error: dbError } = await supabase
      .from('fournisseurs')
      .insert({ ...base, site_web: form.site_web.trim() || null })
      .select('id')
      .single()
    if (dbError && /site_web/.test(dbError.message)) {
      ;({ data, error: dbError } = await supabase
        .from('fournisseurs')
        .insert(base)
        .select('id')
        .single())
    }
    setSaving(false)
    if (dbError) {
      setError(dbError.message)
      return
    }
    onSaved(data.id)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="modal-title">Nouvelle fiche</div>

        <div className="fg">
          <div className="fl">
            <label>Nom *</label>
            <input value={form.nom} onChange={(e) => set('nom', e.target.value)} autoFocus />
          </div>
          <div className="fl">
            <label>Type</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}>
              {TYPE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {TYPE_SOCIETE[t].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="fl">
          <label>Adresse</label>
          <input value={form.adresse} onChange={(e) => set('adresse', e.target.value)} />
        </div>

        <div className="fl">
          <label>Famille (produit)</label>
          <input value={form.famille} onChange={(e) => set('famille', e.target.value)} placeholder="ex : Panneaux" />
        </div>

        <div className="fl">
          <label>Site web</label>
          <input value={form.site_web} onChange={(e) => set('site_web', e.target.value)} placeholder="https://…" />
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

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Création / édition des informations d'un chantier.
// `chantier` absent ou sans id → mode création (insert).
export default function ChantierEditModal({ chantier, onClose, onSaved }) {
  const isEdit = Boolean(chantier?.id)
  const [form, setForm] = useState({
    num: chantier?.num ?? '',
    client: chantier?.client ?? '',
    nom: chantier?.nom ?? '',
    ca_id: chantier?.ca_id ?? '',
    dep_approx: chantier?.dep_approx ?? '',
    avec_pose: chantier?.avec_pose ?? false,
  })
  const [utilisateurs, setUtilisateurs] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('utilisateurs')
      .select('id, prenom, nom')
      .order('nom')
      .then(({ data }) => setUtilisateurs(data ?? []))
  }, [])

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
    const payload = {
      num: form.num.trim() || null,
      client: form.client.trim() || null,
      nom: form.nom.trim(),
      ca_id: form.ca_id || null,
      dep_approx: form.dep_approx || null,
      avec_pose: form.avec_pose,
    }
    const { error: dbError } = isEdit
      ? await supabase.from('chantiers').update(payload).eq('id', chantier.id)
      : await supabase.from('chantiers').insert(payload)
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
        <div className="modal-title">{isEdit ? 'Modifier le chantier' : 'Nouveau chantier'}</div>

        <div className="fg">
          <div className="fl">
            <label>N° chantier</label>
            <input value={form.num} onChange={(e) => set('num', e.target.value)} />
          </div>
          <div className="fl">
            <label>Client</label>
            <input value={form.client} onChange={(e) => set('client', e.target.value)} />
          </div>
        </div>

        <div className="fl">
          <label>Nom *</label>
          <input value={form.nom} onChange={(e) => set('nom', e.target.value)} autoFocus />
        </div>

        <div className="fg">
          <div className="fl">
            <label>Chargé d'affaire</label>
            <select value={form.ca_id} onChange={(e) => set('ca_id', e.target.value)}>
              <option value="">—</option>
              {utilisateurs.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="fl">
            <label>Départ approx.</label>
            <input type="date" value={form.dep_approx} onChange={(e) => set('dep_approx', e.target.value)} />
          </div>
        </div>

        <label className="checkbox-label" style={{ marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={form.avec_pose}
            onChange={(e) => set('avec_pose', e.target.checked)}
          />
          Chantier avec pose
        </label>

        {error && <div className="alert">{error}</div>}

        <div className="modal-actions">
          <button className="btn bp" disabled={saving} onClick={handleSave}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button className="btn bg" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

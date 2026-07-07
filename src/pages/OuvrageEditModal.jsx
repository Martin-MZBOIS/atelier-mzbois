import { useState } from 'react'
import { supabase } from '../lib/supabase'

function num(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

// Édition complète d'un ouvrage.
export default function OuvrageEditModal({ ouvrage, employes, onClose, onSaved }) {
  const [form, setForm] = useState({
    nom: ouvrage.nom ?? '',
    qty: ouvrage.qty ?? 1,
    devis: ouvrage.devis ?? '',
    dep: ouvrage.dep ?? '',
    livraison: ouvrage.livraison ?? '',
    camion: ouvrage.camion ?? '',
    pose: ouvrage.pose ?? false,
    dp_pose: ouvrage.dp_pose ?? '',
    poseur_id: ouvrage.poseur_id ?? '',
    sit_pct: ouvrage.sit_pct ?? '',
    fact_def: ouvrage.fact_def ?? false,
    notes: ouvrage.notes ?? '',
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
    const { error: dbError } = await supabase
      .from('ouvrages')
      .update({
        nom: form.nom.trim(),
        qty: num(form.qty) ?? 1,
        devis: form.devis.trim() || null,
        dep: form.dep || null,
        livraison: form.livraison || null,
        camion: form.camion.trim() || null,
        pose: form.pose,
        dp_pose: form.dp_pose || null,
        poseur_id: form.poseur_id || null,
        sit_pct: num(form.sit_pct),
        fact_def: form.fact_def,
        notes: form.notes.trim() || null,
      })
      .eq('id', ouvrage.id)
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
        <div className="modal-title">Modifier l'ouvrage</div>

        <div className="fg">
          <div className="fl">
            <label>Nom *</label>
            <input value={form.nom} onChange={(e) => set('nom', e.target.value)} autoFocus />
          </div>
          <div className="fl">
            <label>Quantité</label>
            <input type="number" min="1" value={form.qty} onChange={(e) => set('qty', e.target.value)} />
          </div>
        </div>

        <div className="fg">
          <div className="fl">
            <label>N° Devis</label>
            <input value={form.devis} onChange={(e) => set('devis', e.target.value)} placeholder="ex : DEV-001" />
          </div>
          <div className="fl">
            <label>Avancement (%)</label>
            <input type="number" min="0" max="100" value={form.sit_pct} onChange={(e) => set('sit_pct', e.target.value)} />
          </div>
        </div>

        <div className="fg">
          <div className="fl">
            <label>Départ atelier</label>
            <input type="date" value={form.dep} onChange={(e) => set('dep', e.target.value)} />
          </div>
          <div className="fl">
            <label>Livraison</label>
            <input type="date" value={form.livraison} onChange={(e) => set('livraison', e.target.value)} />
          </div>
        </div>

        <div className="fl">
          <label>Camion</label>
          <input value={form.camion} onChange={(e) => set('camion', e.target.value)} placeholder="ex : 20m3 hayon" />
        </div>

        <div className="fg">
          <div className="fl">
            <label>Date de pose</label>
            <input type="date" value={form.dp_pose} onChange={(e) => set('dp_pose', e.target.value)} />
          </div>
          <div className="fl">
            <label>Poseur</label>
            <select value={form.poseur_id} onChange={(e) => set('poseur_id', e.target.value)}>
              <option value="">—</option>
              {employes.map((em) => (
                <option key={em.id} value={em.id}>
                  {em.prenom} {em.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ov-edit-checks">
          <label className="checkbox-label">
            <input type="checkbox" checked={form.pose} onChange={(e) => set('pose', e.target.checked)} />
            À poser
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={form.fact_def} onChange={(e) => set('fact_def', e.target.checked)} />
            Facturé
          </label>
        </div>

        <div className="fl">
          <label>Notes</label>
          <textarea className="ni" rows="2" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>

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

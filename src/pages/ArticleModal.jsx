import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { TYP_ACHAT, TYP_ACHAT_ORDER } from '../lib/statuts'

function num(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

// Création d'un article de bibliothèque (+ fournisseurs associés).
export default function ArticleModal({ fournisseurs, onClose, onSaved }) {
  const [form, setForm] = useState({
    nom: '',
    description: '',
    typ: 'panneau',
    prix: '',
    unite: '',
  })
  const [fids, setFids] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function toggleFid(id) {
    setFids((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSave() {
    if (!form.nom.trim()) {
      setError('Le nom est obligatoire.')
      return
    }
    setSaving(true)
    setError('')
    const { data, error: dbError } = await supabase
      .from('articles')
      .insert({
        nom: form.nom.trim(),
        description: form.description.trim() || null,
        typ: form.typ || null,
        prix: num(form.prix),
        unite: form.unite.trim() || null,
      })
      .select('id')
      .single()
    if (dbError) {
      setSaving(false)
      setError(dbError.message)
      return
    }
    if (fids.length) {
      const rows = fids.map((fid) => ({
        article_id: data.id,
        fournisseur_id: fid,
      }))
      const { error: jErr } = await supabase
        .from('article_fournisseurs')
        .insert(rows)
      if (jErr) {
        setSaving(false)
        setError('Article créé mais fournisseurs en échec : ' + jErr.message)
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
        <div className="modal-title">Nouvel article</div>

        <div className="fg">
          <div className="fl">
            <label>Nom *</label>
            <input value={form.nom} onChange={(e) => set('nom', e.target.value)} autoFocus />
          </div>
          <div className="fl">
            <label>Typologie</label>
            <select value={form.typ} onChange={(e) => set('typ', e.target.value)}>
              {TYP_ACHAT_ORDER.map((slug) => (
                <option key={slug} value={slug}>
                  {TYP_ACHAT[slug].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="fl">
          <label>Description</label>
          <input value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div className="fg">
          <div className="fl">
            <label>Prix (€)</label>
            <input type="number" step="0.01" value={form.prix} onChange={(e) => set('prix', e.target.value)} />
          </div>
          <div className="fl">
            <label>Unité</label>
            <input value={form.unite} onChange={(e) => set('unite', e.target.value)} placeholder="panneau, ml, m²…" />
          </div>
        </div>

        <div className="sl">Fournisseurs</div>
        <div className="checkbox-grid">
          {fournisseurs.map((f) => (
            <label key={f.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={fids.includes(f.id)}
                onChange={() => toggleFid(f.id)}
              />
              {f.nom}
            </label>
          ))}
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

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  TYP_ACHAT,
  TYP_ACHAT_ORDER,
  STATUT_ACHAT,
  STATUT_ACHAT_ORDER,
} from '../lib/statuts'

// Convertit une saisie en nombre ou null.
function num(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

// chantiers (optionnel) : si fourni, affiche un sélecteur de chantier (ajout global).
// chantierId : chantier par défaut / fixe (onglet d'une fiche chantier).
export default function AchatModal({
  chantierId,
  chantiers,
  fournisseurs,
  achat,
  onClose,
  onSaved,
}) {
  const isEdit = Boolean(achat)
  const showChantierPicker = Array.isArray(chantiers) && chantiers.length > 0
  const [form, setForm] = useState(() => ({
    chantier_id: achat?.chantier_id ?? chantierId ?? '',
    nom: achat?.nom ?? '',
    ref: achat?.ref ?? '',
    typ: achat?.typ ?? 'panneau',
    fournisseur_id: achat?.fournisseur_id ?? '',
    dtl: achat?.dtl ?? '',
    qty: achat?.qty ?? '',
    stk: achat?.stk ?? '',
    acmd: achat?.acmd ?? '',
    st: achat?.st ?? 'a_traiter',
    prix_u: achat?.prix_u ?? '',
    mht: achat?.mht ?? '',
  }))
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
    if (!form.chantier_id) {
      setError('Le chantier est obligatoire.')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      chantier_id: form.chantier_id,
      nom: form.nom.trim(),
      ref: form.ref.trim() || null,
      typ: form.typ || null,
      fournisseur_id: form.fournisseur_id || null,
      dtl: form.dtl.trim() || null,
      qty: num(form.qty),
      stk: num(form.stk),
      acmd: num(form.acmd),
      st: form.st || null,
      prix_u: num(form.prix_u),
      mht: num(form.mht),
    }
    const query = isEdit
      ? supabase.from('achats').update(payload).eq('id', achat.id)
      : supabase.from('achats').insert(payload)
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
        <div className="modal-title">
          {isEdit ? "Modifier l'achat" : 'Nouvel achat'}
        </div>

        {showChantierPicker && (
          <div className="fl">
            <label>Chantier *</label>
            <select
              value={form.chantier_id}
              onChange={(e) => set('chantier_id', e.target.value)}
            >
              <option value="">—</option>
              {chantiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.num} · {c.nom}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="fg">
          <div className="fl">
            <label>Nom *</label>
            <input
              value={form.nom}
              onChange={(e) => set('nom', e.target.value)}
              autoFocus
            />
          </div>
          <div className="fl">
            <label>Référence</label>
            <input value={form.ref} onChange={(e) => set('ref', e.target.value)} />
          </div>
        </div>

        <div className="fg">
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
          <div className="fl">
            <label>Fournisseur</label>
            <select
              value={form.fournisseur_id}
              onChange={(e) => set('fournisseur_id', e.target.value)}
            >
              <option value="">—</option>
              {fournisseurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="fl">
          <label>Détail</label>
          <input value={form.dtl} onChange={(e) => set('dtl', e.target.value)} />
        </div>

        <div className="fg3">
          <div className="fl">
            <label>Quantité</label>
            <input
              type="number"
              value={form.qty}
              onChange={(e) => set('qty', e.target.value)}
            />
          </div>
          <div className="fl">
            <label>Stock</label>
            <input
              type="number"
              value={form.stk}
              onChange={(e) => set('stk', e.target.value)}
            />
          </div>
          <div className="fl">
            <label>À commander</label>
            <input
              type="number"
              value={form.acmd}
              onChange={(e) => set('acmd', e.target.value)}
            />
          </div>
        </div>

        <div className="fg3">
          <div className="fl">
            <label>Statut</label>
            <select value={form.st} onChange={(e) => set('st', e.target.value)}>
              {STATUT_ACHAT_ORDER.map((slug) => (
                <option key={slug} value={slug}>
                  {STATUT_ACHAT[slug].label}
                </option>
              ))}
            </select>
          </div>
          <div className="fl">
            <label>Prix unit. (€)</label>
            <input
              type="number"
              value={form.prix_u}
              onChange={(e) => set('prix_u', e.target.value)}
            />
          </div>
          <div className="fl">
            <label>Montant HT (€)</label>
            <input
              type="number"
              value={form.mht}
              onChange={(e) => set('mht', e.target.value)}
            />
          </div>
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

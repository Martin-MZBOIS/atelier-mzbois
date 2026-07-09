import { useState } from 'react'
import { supabase } from '../lib/supabase'

const ROLES = ['BE', 'Prog', 'Chef', 'Menuisier', 'Poseur', 'Autre']
const CONTRATS = ['CDI', 'CDD', 'Intérim', 'Apprentissage', 'Stage']

function num(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

// Création ou édition d'une fiche salarié complète.
export default function SalarieModal({ employe, onClose, onSaved }) {
  const isEdit = !!employe
  const [form, setForm] = useState({
    prenom: employe?.prenom ?? '',
    nom: employe?.nom ?? '',
    role: employe?.role ?? 'Menuisier',
    poste: employe?.poste ?? '',
    contrat: employe?.contrat ?? 'CDI',
    date_entree: employe?.date_entree ?? '',
    date_naissance: employe?.date_naissance ?? '',
    tel: employe?.tel ?? '',
    email: employe?.email ?? '',
    cout_h: employe?.cout_h ?? '',
    note: employe?.note ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.prenom.trim() || !form.nom.trim()) {
      setError('Le prénom et le nom sont obligatoires.')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      prenom: form.prenom.trim(),
      nom: form.nom.trim(),
      role: form.role || null,
      poste: form.poste.trim() || null,
      contrat: form.contrat || null,
      date_entree: form.date_entree || null,
      date_naissance: form.date_naissance || null,
      tel: form.tel.trim() || null,
      email: form.email.trim() || null,
      cout_h: num(form.cout_h),
      note: form.note.trim() || null,
    }

    // Insert/update ; repli sans date_naissance si la colonne n'existe pas encore.
    async function run(withNaissance) {
      const body = withNaissance ? payload : (() => { const { date_naissance, ...rest } = payload; return rest })()
      if (isEdit) {
        return supabase.from('employes').update(body).eq('id', employe.id).select('id').single()
      }
      return supabase.from('employes').insert(body).select('id').single()
    }
    let { data, error: dbError } = await run(true)
    if (dbError && /date_naissance/.test(dbError.message)) {
      ;({ data, error: dbError } = await run(false))
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
        <div className="modal-title">{isEdit ? 'Modifier le salarié' : 'Nouveau salarié'}</div>

        <div className="fg">
          <div className="fl">
            <label>Prénom *</label>
            <input value={form.prenom} onChange={(e) => set('prenom', e.target.value)} autoFocus />
          </div>
          <div className="fl">
            <label>Nom *</label>
            <input value={form.nom} onChange={(e) => set('nom', e.target.value)} />
          </div>
        </div>

        <div className="fg3">
          <div className="fl">
            <label>Rôle</label>
            <select value={form.role} onChange={(e) => set('role', e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="fl">
            <label>Poste</label>
            <input value={form.poste} onChange={(e) => set('poste', e.target.value)} placeholder="ex : Atelier" />
          </div>
          <div className="fl">
            <label>Contrat</label>
            <select value={form.contrat} onChange={(e) => set('contrat', e.target.value)}>
              {CONTRATS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="fg3">
          <div className="fl">
            <label>Date d'entrée</label>
            <input type="date" value={form.date_entree} onChange={(e) => set('date_entree', e.target.value)} />
          </div>
          <div className="fl">
            <label>Date de naissance</label>
            <input type="date" value={form.date_naissance} onChange={(e) => set('date_naissance', e.target.value)} />
          </div>
          <div className="fl">
            <label>Coût horaire (€/h)</label>
            <input type="number" step="0.01" value={form.cout_h} onChange={(e) => set('cout_h', e.target.value)} />
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

        <div className="fl">
          <label>Note</label>
          <textarea className="ni" rows="2" value={form.note} onChange={(e) => set('note', e.target.value)} />
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

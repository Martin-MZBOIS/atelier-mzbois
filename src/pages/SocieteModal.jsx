import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../store/toasts'
import { useSettings } from '../store/settings'
import { TYPE_SOCIETE } from '../lib/statuts'

const TYPE_ORDER = ['fournisseur', 'client', 'sous_traitant', 'transporteur']

// Création / édition d'une fiche société (fournisseur / client / sous-traitant / transporteur).
export default function SocieteModal({ societe, defaultType, onClose, onSaved }) {
  const isEdit = Boolean(societe)
  const specialitesOptions = useSettings((s) => s.specialites) ?? []
  const [form, setForm] = useState({
    nom: societe?.nom ?? '',
    adresse: societe?.adresse ?? '',
    adresse_livraison: societe?.adresse_livraison ?? '',
    famille: societe?.famille ?? '',
    site_web: societe?.site_web ?? '',
    type: societe?.type ?? defaultType ?? 'fournisseur',
  })
  const [specs, setSpecs] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Charge les spécialités existantes d'un sous-traitant en édition.
  useEffect(() => {
    if (!societe?.id) return
    supabase
      .from('soustraitant_specialites')
      .select('specialite')
      .eq('fournisseur_id', societe.id)
      .then(({ data }) => data && setSpecs(data.map((r) => r.specialite)))
  }, [societe?.id])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleSpec(sp) {
    setSpecs((prev) => (prev.includes(sp) ? prev.filter((s) => s !== sp) : [...prev, sp]))
  }

  // Remplace les spécialités du sous-traitant (best-effort, ignoré si table absente).
  async function syncSpecialites(fournisseurId) {
    await supabase.from('soustraitant_specialites').delete().eq('fournisseur_id', fournisseurId)
    if (specs.length) {
      await supabase
        .from('soustraitant_specialites')
        .insert(specs.map((specialite) => ({ fournisseur_id: fournisseurId, specialite })))
    }
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
    const withSite = { ...base, site_web: form.site_web.trim() || null }
    const full = { ...withSite, adresse_livraison: form.adresse_livraison.trim() || null }

    async function run(payload) {
      return isEdit
        ? supabase.from('fournisseurs').update(payload).eq('id', societe.id).select('id').single()
        : supabase.from('fournisseurs').insert(payload).select('id').single()
    }

    // Repli progressif si des colonnes n'existent pas (site_web 0010, adresse_livraison 0015).
    let { data, error: dbError } = await run(full)
    if (dbError && /adresse_livraison/.test(dbError.message)) {
      ;({ data, error: dbError } = await run(withSite))
    }
    if (dbError && /site_web/.test(dbError.message)) {
      ;({ data, error: dbError } = await run(base))
    }
    if (dbError) {
      setSaving(false)
      setError(dbError.message)
      return
    }
    // Les spécialités n'existent que pour les sous-traitants : on les synchronise
    // pour ceux-ci, et on purge celles d'une société qui a changé de type.
    try {
      if (form.type === 'sous_traitant') {
        await syncSpecialites(data.id)
      } else {
        await supabase.from('soustraitant_specialites').delete().eq('fournisseur_id', data.id)
      }
    } catch {
      /* table absente (migration 0023 non passée) : on ignore */
    }
    setSaving(false)
    toast('Fiche enregistrée')
    onSaved(data.id)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="modal-title">{isEdit ? 'Modifier la fiche' : 'Nouvelle fiche'}</div>

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
          <label>Adresse siège social</label>
          <input value={form.adresse} onChange={(e) => set('adresse', e.target.value)} />
        </div>

        <div className="fl">
          <label>Adresse de livraison (si différente)</label>
          <input
            value={form.adresse_livraison}
            onChange={(e) => set('adresse_livraison', e.target.value)}
            placeholder="Optionnel"
          />
        </div>

        <div className="fl">
          <label>Famille (produit)</label>
          <input value={form.famille} onChange={(e) => set('famille', e.target.value)} placeholder="ex : Panneaux" />
        </div>

        <div className="fl">
          <label>Site web</label>
          <input value={form.site_web} onChange={(e) => set('site_web', e.target.value)} placeholder="https://…" />
        </div>

        {form.type === 'sous_traitant' && (
          <div className="fl">
            <label>Spécialités</label>
            <div className="spec-picker">
              {specialitesOptions.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  className={'spec-chip' + (specs.includes(sp) ? ' spec-chip--on' : '')}
                  onClick={() => toggleSpec(sp)}
                >
                  {sp}
                </button>
              ))}
              {specialitesOptions.length === 0 && (
                <span className="muted">Aucune spécialité paramétrée.</span>
              )}
            </div>
          </div>
        )}

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

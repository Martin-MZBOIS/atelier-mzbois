import { useEffect, useState } from 'react'
import SelectSearch from '../components/SelectSearch'
import { raccourcisModal } from '../lib/clavier'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store'
import { toast } from '../store/toasts'
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
  presetTyp,
  linkOuvrageId,
  onClose,
  onSaved,
}) {
  const isEdit = Boolean(achat)
  // Confidentialité (P4-4A) : le Chargé d'affaire ne voit pas les montants.
  const canSeePrix = useAuthStore((s) => s.user?.role) !== 'ca'
  const showChantierPicker = Array.isArray(chantiers) && chantiers.length > 0
  const [form, setForm] = useState(() => ({
    chantier_id: achat?.chantier_id ?? chantierId ?? '',
    nom: achat?.nom ?? '',
    ref: achat?.ref ?? '',
    typ: achat?.typ ?? presetTyp ?? 'panneau',
    fournisseur_id: achat?.fournisseur_id ?? '',
    dtl: achat?.dtl ?? '',
    qty: achat?.qty ?? '',
    stk: achat?.stk ?? '',
    acmd: achat?.acmd ?? '',
    st: achat?.st ?? 'a_traiter',
    prix_u: achat?.prix_u ?? '',
    mht: achat?.mht ?? '',
    date_reception: achat?.date_reception ?? '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Les listes ne chargent pas les colonnes de détail (prix_u, mht,
  // date_reception) : on les récupère à l'ouverture du modal en édition.
  useEffect(() => {
    if (!achat?.id) return
    let active = true
    supabase
      .from('achats')
      .select('prix_u, mht, date_reception')
      .eq('id', achat.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return
        setForm((f) => ({
          ...f,
          prix_u: f.prix_u !== '' ? f.prix_u : data.prix_u ?? '',
          mht: f.mht !== '' ? f.mht : data.mht ?? '',
          date_reception: f.date_reception || data.date_reception || '',
        }))
      })
    return () => {
      active = false
    }
  }, [achat?.id])

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
      date_reception: form.date_reception || null,
    }
    // On n'écrit les montants que si l'utilisateur a le droit de les voir
    // (évite qu'un CA, à qui les champs sont masqués, écrase les prix).
    if (canSeePrix) {
      payload.prix_u = num(form.prix_u)
      payload.mht = num(form.mht)
    }
    if (isEdit) {
      const { error: dbError } = await supabase
        .from('achats')
        .update(payload)
        .eq('id', achat.id)
      setSaving(false)
      if (dbError) {
        setError(dbError.message)
        return
      }
    } else {
      const { data, error: dbError } = await supabase
        .from('achats')
        .insert(payload)
        .select('id')
        .single()
      if (dbError) {
        setSaving(false)
        setError(dbError.message)
        return
      }
      // Liaison à un ouvrage (achat rapide depuis un ouvrage)
      if (linkOuvrageId && data?.id) {
        const { error: linkErr } = await supabase
          .from('achats_ouvrages')
          .insert({ achat_id: data.id, ouvrage_id: linkOuvrageId })
        if (linkErr) {
          setSaving(false)
          setError('Achat créé mais liaison en échec : ' + linkErr.message)
          return
        }
      }
      setSaving(false)
    }
    toast('Achat enregistré')
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
        <div className="modal-title">
          {isEdit ? "Modifier l'achat" : 'Nouvel achat'}
        </div>

        {showChantierPicker && (
          <div className="fl">
            <label>Chantier *</label>
            <SelectSearch
              value={form.chantier_id}
              onChange={(v) => set('chantier_id', v)}
              options={chantiers.map((c) => ({ value: c.id, label: c.num + ' · ' + (c.nom ?? '') }))}
              allowEmpty
            />
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
            <SelectSearch
              value={form.typ}
              onChange={(v) => set('typ', v)}
              options={TYP_ACHAT_ORDER.map((s) => ({ value: s, label: TYP_ACHAT[s].label }))}
            />
          </div>
          <div className="fl">
            <label>Fournisseur</label>
            <SelectSearch
              value={form.fournisseur_id}
              onChange={(v) => set('fournisseur_id', v)}
              options={fournisseurs.map((f) => ({ value: f.id, label: f.nom }))}
              allowEmpty
            />
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
            <SelectSearch
              value={form.st}
              onChange={(v) => set('st', v)}
              options={STATUT_ACHAT_ORDER.map((s) => ({ value: s, label: STATUT_ACHAT[s].label }))}
            />
          </div>
          {canSeePrix && (
            <>
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
            </>
          )}
        </div>

        <div className="fl">
          <label>Date de réception</label>
          <input
            type="date"
            value={form.date_reception}
            onChange={(e) => set('date_reception', e.target.value)}
          />
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

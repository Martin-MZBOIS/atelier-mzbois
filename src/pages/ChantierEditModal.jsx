import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { raccourcisModal } from '../lib/clavier'
import { toast } from '../store/toasts'

// Création / édition des informations d'un chantier.
// `chantier` absent ou sans id → mode création (insert).
export default function ChantierEditModal({ chantier, onClose, onSaved }) {
  const isEdit = Boolean(chantier?.id)
  const [form, setForm] = useState({
    num: chantier?.num ?? '',
    client: chantier?.client ?? '',
    client_id: chantier?.client_id ?? '',
    nom: chantier?.nom ?? '',
    ca_id: chantier?.ca_id ?? '',
    dep_approx: chantier?.dep_approx ?? '',
    avec_pose: chantier?.avec_pose ?? false,
  })
  const [utilisateurs, setUtilisateurs] = useState([])
  const [clients, setClients] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('utilisateurs')
      .select('id, prenom, nom')
      .order('nom')
      .then(({ data }) => setUtilisateurs(data ?? []))
    // Fiches sociétés de type « client » — pour rattacher le chantier et
    // pouvoir écrire au client (demande de validation d'un ouvrage).
    supabase
      .from('fournisseurs')
      .select('id, nom, contacts:contacts!fournisseur_id(email)')
      .eq('type', 'client')
      .order('nom')
      .then(({ data }) => setClients(data ?? []))
  }, [])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Rattacher une fiche client aligne aussi le libellé affiché du chantier.
  function selectClient(id) {
    const fiche = clients.find((c) => c.id === id)
    setForm((f) => ({ ...f, client_id: id, client: fiche ? fiche.nom : f.client }))
  }

  const ficheClient = clients.find((c) => c.id === form.client_id)
  const emailClient = ficheClient?.contacts?.find((ct) => ct.email)?.email ?? null

  async function handleSave() {
    if (!form.nom.trim()) {
      setError('Le nom est obligatoire.')
      return
    }
    setSaving(true)
    setError('')
    const base = {
      num: form.num.trim() || null,
      client: form.client.trim() || null,
      nom: form.nom.trim(),
      ca_id: form.ca_id || null,
      dep_approx: form.dep_approx || null,
      avec_pose: form.avec_pose,
    }
    const full = { ...base, client_id: form.client_id || null }

    const run = (payload) =>
      isEdit
        ? supabase.from('chantiers').update(payload).eq('id', chantier.id)
        : supabase.from('chantiers').insert(payload)

    // Repli si la colonne client_id (migration 0027) n'existe pas encore.
    let { error: dbError } = await run(full)
    if (dbError && /client_id/.test(dbError.message)) {
      ;({ error: dbError } = await run(base))
    }
    setSaving(false)
    if (dbError) {
      setError(dbError.message)
      return
    }
    toast('Chantier enregistré')
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
          <label>Fiche client (pour lui écrire)</label>
          <select value={form.client_id} onChange={(e) => selectClient(e.target.value)}>
            <option value="">— Aucune fiche rattachée —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          <div className="param-hint" style={{ marginTop: 5 }}>
            {!form.client_id
              ? 'Rattachez une fiche client pour pouvoir lui envoyer une demande de validation.'
              : emailClient
                ? `✓ Email de validation : ${emailClient}`
                : '⚠ Cette fiche client n’a aucun contact avec email — ajoutez-en un dans Contacts.'}
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

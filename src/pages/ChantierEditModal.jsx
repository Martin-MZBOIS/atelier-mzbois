import { useEffect, useState } from 'react'
import SelectSearch from '../components/SelectSearch'
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
    contact_id: chantier?.contact_id ?? '',
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
    // Fiches sociétés de type « client », avec leurs interlocuteurs.
    supabase
      .from('fournisseurs')
      .select('id, nom, contacts:contacts!fournisseur_id(id, nom, role, email)')
      .eq('type', 'client')
      .order('nom')
      .then(({ data }) => setClients(data ?? []))
  }, [])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Changer de client remet le contact à zéro : garder l'ancien désignerait
  // quelqu'un d'une autre société.
  function selectClient(id) {
    const fiche = clients.find((c) => c.id === id)
    setForm((f) => ({
      ...f,
      client_id: id,
      // Sans fiche choisie, on conserve le libellé déjà saisi.
      client: fiche ? fiche.nom : f.client,
      contact_id: '',
    }))
  }

  const ficheClient = clients.find((c) => c.id === form.client_id)
  const contacts = ficheClient?.contacts ?? []
  const contactChoisi = contacts.find((ct) => ct.id === form.contact_id)

  async function handleSave() {
    if (!form.nom.trim()) {
      setError('Le nom est obligatoire.')
      return
    }
    setSaving(true)
    setError('')

    // Deux chantiers portant le même numéro rendent illisibles le planning,
    // les achats et les courses. On prévient ici plutôt que de laisser
    // remonter la violation de contrainte (migration 0031).
    const num = form.num.trim()
    if (num) {
      let q = supabase.from('chantiers').select('id, num, nom').ilike('num', num)
      if (isEdit) q = q.neq('id', chantier.id)
      const { data: homonymes } = await q
      const conflit = (homonymes ?? []).find(
        (c) => (c.num ?? '').trim().toLowerCase() === num.toLowerCase()
      )
      if (conflit) {
        setSaving(false)
        setError(
          `Le numéro ${conflit.num} est déjà utilisé par « ${conflit.nom} ». ` +
            'Choisissez-en un autre.'
        )
        return
      }
    }

    const base = {
      num: form.num.trim() || null,
      client: form.client.trim() || null,
      nom: form.nom.trim(),
      ca_id: form.ca_id || null,
      dep_approx: form.dep_approx || null,
      avec_pose: form.avec_pose,
    }
    const avecClient = { ...base, client_id: form.client_id || null }
    const full = { ...avecClient, contact_id: form.contact_id || null }

    const run = (payload) =>
      isEdit
        ? supabase.from('chantiers').update(payload).eq('id', chantier.id)
        : supabase.from('chantiers').insert(payload)

    // Replis successifs si contact_id (0029) puis client_id (0027) n'existent
    // pas encore en base : l'enregistrement passe quand même.
    let { error: dbError } = await run(full)
    if (dbError && /contact_id/.test(dbError.message)) {
      ;({ error: dbError } = await run(avecClient))
    }
    if (dbError && /client_id/.test(dbError.message)) {
      ;({ error: dbError } = await run(base))
    }
    setSaving(false)
    if (dbError) {
      // La contrainte d'unicité peut se déclencher malgré la vérification
      // ci-dessus, si quelqu'un enregistre le même numéro entre-temps.
      const doublon =
        dbError.code === '23505' || /idx_chantiers_num_unique/.test(dbError.message)
      setError(
        doublon
          ? `Le numéro ${num} vient d’être attribué à un autre chantier. Choisissez-en un autre.`
          : dbError.message
      )
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
            <SelectSearch
              value={form.client_id}
              onChange={selectClient}
              options={clients.map((c) => ({ value: c.id, label: c.nom }))}
              allowEmpty
              emptyLabel={form.client || '— Aucun client —'}
            />
          </div>
        </div>

        <div className="fl">
          <label>Contact</label>
          <SelectSearch
            value={form.contact_id}
            onChange={(v) => set('contact_id', v)}
            disabled={!form.client_id}
            options={contacts.map((ct) => ({
              value: ct.id,
              label: ct.nom,
              sub: ct.role || ct.email || '',
            }))}
            allowEmpty
            emptyLabel="— Aucun contact désigné —"
          />
          <div className="param-hint" style={{ marginTop: 5 }}>
            {!form.client_id
              ? 'Choisissez d’abord un client : ses contacts s’afficheront ici.'
              : contacts.length === 0
                ? '⚠ Cette fiche client n’a aucun contact — ajoutez-en un dans Contacts.'
                : contactChoisi
                  ? contactChoisi.email
                    ? `✓ Demande de validation envoyée à ${contactChoisi.email}`
                    : '⚠ Ce contact n’a pas d’email — impossible de lui écrire.'
                  : 'Désignez l’interlocuteur à qui envoyer les demandes de validation.'}
          </div>
        </div>

        <div className="fl">
          <label>Nom *</label>
          <input value={form.nom} onChange={(e) => set('nom', e.target.value)} autoFocus />
        </div>

        <div className="fg">
          <div className="fl">
            <label>Chargé d'affaire</label>
            <SelectSearch
              value={form.ca_id}
              onChange={(v) => set('ca_id', v)}
              options={utilisateurs.map((u) => ({ value: u.id, label: u.prenom + ' ' + u.nom }))}
              allowEmpty
            />
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

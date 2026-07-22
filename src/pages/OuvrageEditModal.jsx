import { useEffect, useState } from 'react'
import SelectSearch from '../components/SelectSearch'
import { raccourcisModal } from '../lib/clavier'
import { supabase } from '../lib/supabase'
import { logModifs } from '../lib/historique'
import { TYPE_LIVRAISON, TYPE_LIVRAISON_ORDER } from '../lib/statuts'
import { useSettings } from '../store/settings'

function num(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

// Édition complète d'un ouvrage.
export default function OuvrageEditModal({ ouvrage, employes, user, chantierId, onClose, onSaved }) {
  const [form, setForm] = useState({
    nom: ouvrage.nom ?? '',
    qty: ouvrage.qty ?? 1,
    devis: ouvrage.devis ?? '',
    dep: ouvrage.dep ?? '',
    type_livraison: ouvrage.type_livraison ?? '',
    camion: ouvrage.camion ?? '',
    transporteur_id: ouvrage.transporteur_id ?? '',
    pose: ouvrage.pose ?? false,
    dp_pose: ouvrage.dp_pose ?? '',
    poseur_id: ouvrage.poseur_id ?? '',
    sit_pct: ouvrage.sit_pct ?? '',
    fact_def: ouvrage.fact_def ?? false,
    notes: ouvrage.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const camions = useSettings((s) => s.camions) ?? []
  const [transporteurs, setTransporteurs] = useState([])

  // Sociétés de transport déjà enregistrées dans Contacts — les mêmes que
  // celles proposées par le module Courses.
  useEffect(() => {
    let actif = true
    supabase
      .from('fournisseurs')
      .select('id, nom')
      .eq('type', 'transporteur')
      .order('nom')
      .then(({ data }) => actif && setTransporteurs(data ?? []))
    return () => {
      actif = false
    }
  }, [])

  const modeLivraison = TYPE_LIVRAISON[form.type_livraison] ?? null

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Changer de mode d'acheminement efface ce qui n'a plus de sens : un
  // enlèvement client ne garde ni camion ni transporteur.
  function setTypeLivraison(v) {
    const mode = TYPE_LIVRAISON[v]
    setForm((f) => ({
      ...f,
      type_livraison: v,
      camion: mode?.camion ? f.camion : '',
      transporteur_id: mode?.transporteur ? f.transporteur_id : '',
    }))
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
      qty: num(form.qty) ?? 1,
      devis: form.devis.trim() || null,
      dep: form.dep || null,
      camion: form.camion.trim() || null,
      pose: form.pose,
      dp_pose: form.dp_pose || null,
      poseur_id: form.poseur_id || null,
      sit_pct: num(form.sit_pct),
      fact_def: form.fact_def,
      notes: form.notes.trim() || null,
    }
    const complet = {
      ...base,
      type_livraison: form.type_livraison || null,
      transporteur_id: form.transporteur_id || null,
    }
    const enregistrer = (payload) =>
      supabase.from('ouvrages').update(payload).eq('id', ouvrage.id)

    // Repli si la migration 0032 n'est pas encore passée.
    let { error: dbError } = await enregistrer(complet)
    if (dbError && /type_livraison|transporteur_id/.test(dbError.message)) {
      ;({ error: dbError } = await enregistrer(base))
    }
    if (dbError) {
      setSaving(false)
      setError(dbError.message)
      return
    }

    // Traçabilité : si un Admin modifie la situation (%) ou la facturation.
    if (user?.role === 'admin') {
      await logModifs(
        {
          'situation %': [ouvrage.sit_pct, num(form.sit_pct)],
          facturation: [ouvrage.fact_def ? 'Facturé' : 'Non facturé', form.fact_def ? 'Facturé' : 'Non facturé'],
        },
        { table: 'ouvrages', chantierId, user }
      )
    }

    setSaving(false)
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
        </div>

        {/* Acheminement : le type de livraison commande les champs suivants. */}
        <div className="fl">
          <label>Type de livraison</label>
          <SelectSearch
            value={form.type_livraison}
            onChange={setTypeLivraison}
            allowEmpty
            emptyLabel="— Non défini —"
            options={TYPE_LIVRAISON_ORDER.map((slug) => ({
              value: slug,
              label: TYPE_LIVRAISON[slug].label,
            }))}
          />
        </div>

        {(modeLivraison?.camion || modeLivraison?.transporteur) && (
          <div className="fg">
            {modeLivraison.camion && (
              <div className="fl">
                <label>Type de camion</label>
                <SelectSearch
                  value={form.camion}
                  onChange={(v) => set('camion', v)}
                  allowEmpty
                  options={camions.map((c) => ({ value: c, label: c }))}
                />
              </div>
            )}
            {modeLivraison.transporteur && (
              <div className="fl">
                <label>Transporteur</label>
                <SelectSearch
                  value={form.transporteur_id}
                  onChange={(v) => set('transporteur_id', v)}
                  allowEmpty
                  options={transporteurs.map((t) => ({ value: t.id, label: t.nom }))}
                />
                {transporteurs.length === 0 && (
                  <div className="param-hint" style={{ marginTop: 5 }}>
                    Aucune société de transport enregistrée — ajoutez-en une dans
                    Contacts.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="fg">
          <div className="fl">
            <label>Date de pose</label>
            <input type="date" value={form.dp_pose} onChange={(e) => set('dp_pose', e.target.value)} />
          </div>
          <div className="fl">
            <label>Poseur</label>
            <SelectSearch
              value={form.poseur_id}
              onChange={(v) => set('poseur_id', v)}
              options={employes.map((em) => ({ value: em.id, label: em.prenom + ' ' + em.nom }))}
              allowEmpty
            />
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

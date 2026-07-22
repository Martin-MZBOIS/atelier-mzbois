import { useEffect, useState } from 'react'
import SelectSearch from '../components/SelectSearch'
import EmptyState from '../components/EmptyState'
import { SkelList } from '../components/Skeleton'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import { useAuthStore } from '../store'
import { toast } from '../store/toasts'
import { formatDate, initialesClient, numeroSemaine } from '../lib/format'
import {
  STATUT_OUVRAGE,
  STATUT_OUVRAGE_ORDER,
  TYP_ACHAT,
  TYP_ACHAT_ORDER,
  ouvragePhase,
  resolve,
} from '../lib/statuts'
import ModelsModal from './ModelsModal'
import OuvrageApplyModal from './OuvrageApplyModal'
import OuvrageEditModal from './OuvrageEditModal'
import AchatModal from './AchatModal'

const EMPTY_ADD = {
  nom: '',
  qty: '1',
  devis: '',
  dep: '',
  camion: '',
}
function num(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

export default function OuvragesTab() {
  const { chantier } = useOutletContext()
  const user = useAuthStore((s) => s.user)
  const [ouvrages, setOuvrages] = useState([])
  const [employes, setEmployes] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(null)

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_ADD)
  const [showModels, setShowModels] = useState(false)
  const [applyMode, setApplyMode] = useState(null) // 'depart' | 'pose' | null
  const [quickPurchase, setQuickPurchase] = useState(null) // { ouvrageId, typ }
  const [editing, setEditing] = useState(null) // ouvrage en cours d'édition
  // Interlocuteur à qui adresser une demande de validation d'ouvrage.
  // On écrit au contact désigné sur le chantier (migration 0029). À défaut —
  // chantier ancien ou migration non passée — on retombe sur le premier contact
  // de la fiche client qui possède un email.
  const [clientMail, setClientMail] = useState(null)

  useEffect(() => {
    let active = true
    setClientMail(null)
    if (!chantier.client_id) return
    supabase
      .from('fournisseurs')
      .select('nom, contacts:contacts!fournisseur_id(id, nom, email)')
      .eq('id', chantier.client_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return
        const contacts = data.contacts ?? []
        const designe = chantier.contact_id
          ? contacts.find((c) => c.id === chantier.contact_id)
          : null
        const contact = designe?.email ? designe : contacts.find((c) => c.email)
        setClientMail(
          contact?.email
            ? { email: contact.email, nom: data.nom, contact: contact.nom }
            : null
        )
      })
    return () => {
      active = false
    }
  }, [chantier.client_id, chantier.contact_id])

  // Mail de demande de validation d'un ouvrage au client.
  //
  // Les plans ne peuvent pas être joints automatiquement : un lien mailto ne
  // transporte pas de pièce jointe. Le message s'ouvre rédigé dans la messagerie,
  // où l'on attache les plans avant d'envoyer.
  function mailtoValidation(o) {
    const reference = `${chantier.num ?? ''}${chantier.nom ? ' — ' + chantier.nom : ''}`
    const semaine = numeroSemaine(o.dep)

    const lignes = [
      'Bonjour,',
      '',
      `Vous trouverez en pièce jointe les plans du ${o.nom}, chantier : ${reference}`,
      '',
    ]
    // Sans date de départ atelier, la ligne n'aurait pas de semaine à annoncer :
    // on la retire plutôt que d'écrire une phrase qui n'a pas été demandée.
    if (semaine) {
      lignes.push(
        `Départ atelier prévu : semaine ${semaine}, sous réserve de votre délai de validation des plans ci-joints.`,
        ''
      )
    }
    lignes.push(
      'Merci de nous retourner votre validation afin que nous puissions lancer en fabrication.',
      '',
      'Cordialement,',
      'MZ Bois & Compagnie'
    )

    // Référence courrier : n° de chantier, trois lettres du client, ouvrage.
    const initiales = initialesClient(chantier.client)
    const prefixe = [chantier.num, initiales].filter(Boolean).join('-')
    const sujet = `${prefixe}${prefixe ? '- ' : ''}Validation — ${o.nom}`
    return (
      'mailto:' +
      encodeURIComponent(clientMail?.email ?? '') +
      '?subject=' +
      encodeURIComponent(sujet) +
      '&body=' +
      encodeURIComponent(lignes.join('\n'))
    )
  }

  async function loadOuvrages() {
    const { data, error: dbError } = await supabase
      .from('ouvrages')
      .select(
        'id, nom, statut, notes, qty, dep, camion, pose, ' +
          'dp_pose, devis, sit_pct, fact_def, ' +
          'poseur:employes!poseur_id(prenom, nom)'
      )
      .eq('chantier_id', chantier.id)
      .order('nom', { ascending: true })
    if (dbError) {
      setError(dbError.message)
      setOuvrages([])
    } else {
      setOuvrages(data ?? [])
    }
  }

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const [, em, fo] = await Promise.all([
        loadOuvrages(),
        supabase.from('employes').select('id, prenom, nom').order('nom'),
        supabase.from('fournisseurs').select('id, nom').eq('type', 'fournisseur').order('nom'),
      ])
      if (!active) return
      setEmployes(em.data ?? [])
      setFournisseurs(fo.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantier.id])

  // Temps réel : statut d'ouvrage modifié par un autre utilisateur.
  useRealtime('ouvrages', loadOuvrages, { filter: `chantier_id=eq.${chantier.id}` })

  async function changeStatut(ouvrageId, newStatut) {
    const previous = ouvrages
    setSaving(ouvrageId)
    setOuvrages((prev) =>
      prev.map((o) => (o.id === ouvrageId ? { ...o, statut: newStatut } : o))
    )
    const { error: dbError } = await supabase
      .from('ouvrages')
      .update({ statut: newStatut })
      .eq('id', ouvrageId)
    setSaving(null)
    if (dbError) {
      setOuvrages(previous)
      setError('Échec de la mise à jour du statut : ' + dbError.message)
      toast.error('Statut non enregistré : ' + dbError.message)
    } else {
      toast('Statut mis à jour — ' + resolve(STATUT_OUVRAGE, newStatut).label)
    }
  }

  function setAdd(key, value) {
    setAddForm((f) => ({ ...f, [key]: value }))
  }

  async function addOuvrage() {
    if (!addForm.nom.trim()) return
    const { error: dbError } = await supabase.from('ouvrages').insert({
      chantier_id: chantier.id,
      nom: addForm.nom.trim(),
      statut: 'a_faire_be',
      qty: num(addForm.qty) ?? 1,
      devis: addForm.devis.trim() || null,
      dep: addForm.dep || null,
      camion: addForm.camion.trim() || null,
      pose: false,
      fact_def: false,
    })
    if (dbError) {
      setError(dbError.message)
      return
    }
    setAddForm(EMPTY_ADD)
    setShowAdd(false)
    await loadOuvrages()
  }

  async function applyModel(model) {
    const { data: ouvrage, error: dbError } = await supabase
      .from('ouvrages')
      .insert({
        chantier_id: chantier.id,
        nom: model.nom,
        notes: model.description ?? null,
        statut: 'a_faire_be',
        qty: 1,
        pose: false,
        fact_def: false,
      })
      .select('id')
      .single()
    setShowModels(false)
    if (dbError) {
      setError(dbError.message)
      return
    }

    // Composition du modèle → propose de créer les achats correspondants (0018).
    const { data: compo, error: cErr } = await supabase
      .from('modele_articles')
      .select('quantite, statut_defaut, article:articles!article_id(nom, typ, prix)')
      .eq('modele_id', model.id)
    if (!cErr && compo && compo.length) {
      const ok = window.confirm(
        `Ce modèle contient ${compo.length} article(s). Créer les achats correspondants sur ce chantier ?`
      )
      if (ok) {
        const rows = compo.map((c) => {
          const qty = Number(c.quantite) || 1
          const prix = c.article?.prix != null ? Number(c.article.prix) : null
          return {
            chantier_id: chantier.id,
            nom: c.article?.nom ?? 'Article',
            typ: c.article?.typ ?? null,
            qty,
            st: c.statut_defaut || 'a_commander',
            prix_u: prix,
            mht: prix != null ? prix * qty : null,
          }
        })
        const { data: inserted, error: aErr } = await supabase.from('achats').insert(rows).select('id')
        // Rattache les achats créés à l'ouvrage (best-effort).
        if (!aErr && inserted && ouvrage) {
          await supabase
            .from('achats_ouvrages')
            .insert(inserted.map((a) => ({ achat_id: a.id, ouvrage_id: ouvrage.id })))
        }
      }
    }

    await loadOuvrages()
  }

  async function applyToAll({ date, poseur }) {
    const patch =
      applyMode === 'pose'
        ? { pose: true, dp_pose: date, poseur_id: poseur }
        : { dep: date }
    const { error: dbError } = await supabase
      .from('ouvrages')
      .update(patch)
      .eq('chantier_id', chantier.id)
    if (dbError) throw dbError
    setApplyMode(null)
    await loadOuvrages()
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <span className="card-title">Ouvrages</span>
          <span className="card-count">{loading ? '' : ouvrages.length}</span>
        </div>
        <div className="card-actions">
          {ouvrages.length > 0 && (
            <button className="btn bg bsm" onClick={() => setApplyMode('depart')}>
              📅 Départ → tous
            </button>
          )}
          {chantier.avec_pose && ouvrages.length > 0 && (
            <button className="btn bg bsm" onClick={() => setApplyMode('pose')}>
              🔧 Pose → tous
            </button>
          )}
          <button className="btn bg bsm" onClick={() => setShowModels(true)}>
            📋 Modèles
          </button>
          <button className="btn bg bsm" onClick={() => setShowAdd((v) => !v)}>
            + Ouvrage
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="add-form">
          <div className="fg">
            <div className="fl">
              <label>Nom *</label>
              <input value={addForm.nom} onChange={(e) => setAdd('nom', e.target.value)} autoFocus />
            </div>
            <div className="fl">
              <label>Quantité</label>
              <input type="number" min="1" value={addForm.qty} onChange={(e) => setAdd('qty', e.target.value)} />
            </div>
          </div>
          <div className="fg">
            <div className="fl">
              <label>N° Devis</label>
              <input value={addForm.devis} onChange={(e) => setAdd('devis', e.target.value)} placeholder="ex : DEV-001" />
            </div>
            <div className="fl">
              <label>Départ atelier</label>
              <input type="date" value={addForm.dep} onChange={(e) => setAdd('dep', e.target.value)} />
            </div>
          </div>
          <div className="fg">
            <div className="fl">
              <label>Camion</label>
              <input value={addForm.camion} onChange={(e) => setAdd('camion', e.target.value)} placeholder="ex : 20m3 hayon" />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn bp bsm" onClick={addOuvrage}>Créer</button>
            <button className="btn bg bsm" onClick={() => { setShowAdd(false); setAddForm(EMPTY_ADD) }}>Annuler</button>
          </div>
        </div>
      )}

      {loading && <SkelList rows={5} />}
      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}
      {!loading && !error && ouvrages.length === 0 && (
        <EmptyState
          ico="📐"
          titre="Aucun ouvrage sur ce chantier"
          aide="Créez le premier ouvrage, ou partez d’un modèle de la bibliothèque."
          action={{ label: '+ Nouvel ouvrage', onClick: () => setShowAdd(true) }}
        />
      )}

      {ouvrages.map((o) => {
        const st = resolve(STATUT_OUVRAGE, o.statut)
        const phase = ouvragePhase(o.statut)
        const qty = Number(o.qty)
        const devis = o.devis
        return (
          <div key={o.id} className="ov" style={{ borderLeftColor: phase.color }}>
            <div className="ov-main">
              <div className="ov-title-row">
                <span
                  className="ov-title ov-title--click"
                  title="Voir / modifier"
                  onClick={() => setEditing(o)}
                >
                  {o.nom}
                </span>
                {qty > 1 && <span className="ov-qty">×{qty}</span>}
              </div>

              <div className="ov-meta">
                {o.dep && <span className="ov-dep">📅 {formatDate(o.dep)}</span>}
                {o.camion && <span className="ov-cam">🚛 {o.camion}</span>}
                {o.pose && o.dp_pose && (
                  <span className="ov-pose">
                    🔧 Pose {formatDate(o.dp_pose)}
                    {o.poseur ? ' — ' + o.poseur.prenom : ''}
                  </span>
                )}
              </div>

              <div className="ov-badges">
                {devis && <span className="ov-tag">{devis}</span>}
                {o.sit_pct != null && (
                  <span className="ov-tag ov-tag--pct">{Number(o.sit_pct)}%</span>
                )}
                {o.fact_def && (
                  <span className="ov-tag ov-tag--fac">✓ Facturé</span>
                )}
              </div>

              {o.notes && <div className="ov-notes">{o.notes}</div>}

              {/* Demande de validation au client (statut « Validation client ») */}
              {o.statut === 'validation_client' && (
                <div className="ov-validation">
                  {clientMail ? (
                    <a
                      className="btn bp bsm"
                      href={mailtoValidation(o)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Écrire à ${clientMail.nom} (${clientMail.email})`}
                    >
                      📧 Demander la validation
                    </a>
                  ) : (
                    <span className="ov-validation-hint">
                      📧 Demande de validation indisponible —{' '}
                      {chantier.client_id
                        ? 'la fiche client n’a aucun contact avec email.'
                        : 'aucune fiche client rattachée à ce chantier.'}
                    </span>
                  )}
                </div>
              )}

              {/* Achat rapide par typologie */}
              <div className="ov-buy">
                {TYP_ACHAT_ORDER.map((slug) => (
                  <button
                    key={slug}
                    className={'buy-btn ' + TYP_ACHAT[slug].cls}
                    onClick={() => setQuickPurchase({ ouvrageId: o.id, typ: slug })}
                  >
                    + {TYP_ACHAT[slug].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ov-side">
              <span
                className="stbadge stbadge--phase"
                style={{ color: phase.color, backgroundColor: phase.color + '1a' }}
                title={st.label}
              >
                <span className="stdot" style={{ backgroundColor: phase.color }} />
                {phase.label}
              </span>
              <SelectSearch
                className="ss"
                value={o.statut ?? ''}
                disabled={saving === o.id}
                onChange={(v) => changeStatut(o.id, v)}
                allowEmpty={o.statut == null}
                options={STATUT_OUVRAGE_ORDER.map((slug) => ({
                  value: slug,
                  label: STATUT_OUVRAGE[slug].label,
                }))}
              />
            </div>
          </div>
        )
      })}

      {showModels && (
        <ModelsModal onApply={applyModel} onClose={() => setShowModels(false)} />
      )}
      {applyMode && (
        <OuvrageApplyModal
          mode={applyMode}
          employes={employes}
          onApply={applyToAll}
          onClose={() => setApplyMode(null)}
        />
      )}
      {quickPurchase && (
        <AchatModal
          chantierId={chantier.id}
          fournisseurs={fournisseurs}
          presetTyp={quickPurchase.typ}
          linkOuvrageId={quickPurchase.ouvrageId}
          onClose={() => setQuickPurchase(null)}
          onSaved={() => setQuickPurchase(null)}
        />
      )}
      {editing && (
        <OuvrageEditModal
          ouvrage={editing}
          employes={employes}
          user={user}
          chantierId={chantier.id}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await loadOuvrages()
          }}
        />
      )}
    </div>
  )
}

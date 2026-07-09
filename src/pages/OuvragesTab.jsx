import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'
import {
  STATUT_OUVRAGE,
  STATUT_OUVRAGE_ORDER,
  TYP_ACHAT,
  TYP_ACHAT_ORDER,
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
  livraison: '',
  camion: '',
}
function num(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

export default function OuvragesTab() {
  const { chantier } = useOutletContext()
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

  async function loadOuvrages() {
    const { data, error: dbError } = await supabase
      .from('ouvrages')
      .select(
        'id, nom, statut, notes, qty, dep, livraison, camion, pose, ' +
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
      livraison: addForm.livraison || null,
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
    const { error: dbError } = await supabase.from('ouvrages').insert({
      chantier_id: chantier.id,
      nom: model.nom,
      notes: model.description ?? null,
      statut: 'a_faire_be',
      qty: 1,
      pose: false,
      fact_def: false,
    })
    setShowModels(false)
    if (dbError) {
      setError(dbError.message)
      return
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
              <label>Livraison</label>
              <input type="date" value={addForm.livraison} onChange={(e) => setAdd('livraison', e.target.value)} />
            </div>
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

      {loading && <p className="muted">Chargement…</p>}
      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}
      {!loading && !error && ouvrages.length === 0 && (
        <div className="empty">Aucun ouvrage</div>
      )}

      {ouvrages.map((o) => {
        const st = resolve(STATUT_OUVRAGE, o.statut)
        const qty = Number(o.qty)
        const devis = o.devis
        return (
          <div key={o.id} className="ov" style={{ borderLeftColor: st.color }}>
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
                {o.livraison && (
                  <span className="ov-liv">🚚 {formatDate(o.livraison)}</span>
                )}
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
              <span className={'stbadge ' + st.cls}>
                <span className="stdot" style={{ backgroundColor: st.color }} />
                {st.label}
              </span>
              <select
                className="ss"
                value={o.statut ?? ''}
                disabled={saving === o.id}
                onChange={(e) => changeStatut(o.id, e.target.value)}
              >
                {o.statut == null && <option value="">—</option>}
                {STATUT_OUVRAGE_ORDER.map((slug) => (
                  <option key={slug} value={slug}>
                    {STATUT_OUVRAGE[slug].label}
                  </option>
                ))}
              </select>
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

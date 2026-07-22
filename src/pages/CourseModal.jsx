import { useEffect, useMemo, useState } from 'react'
import SelectSearch from '../components/SelectSearch'
import { raccourcisModal } from '../lib/clavier'
import { supabase } from '../lib/supabase'
import { toast } from '../store/toasts'
import { STATUT_COURSE, STATUT_COURSE_ORDER } from '../lib/statuts'
import Autocomplete from '../components/Autocomplete'
import { logModifs } from '../lib/historique'

const MZBOIS = { id: 'mzbois', label: 'MZ Bois (atelier)' }

const TYPES = [
  { id: 'livraison', label: '🚚 Livraison', hint: 'Départ MZ Bois par défaut' },
  { id: 'ramasse', label: '📥 Ramasse', hint: 'Arrivée MZ Bois par défaut' },
  { id: 'tournee', label: '🔄 Tournée', hint: 'Trajet multi-étapes' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

// Création / édition d'une course (livraison / ramasse / tournée).
export default function CourseModal({
  chantiers = [],
  employes = [],
  transporteurs = [],
  fournisseurs = [],
  course,
  user,
  defaultChantierId,
  defaultDate,
  onClose,
  onSaved,
}) {
  const isEdit = Boolean(course)
  const isAdmin = user?.role === 'admin'

  const [type, setType] = useState(course?.type_course ?? 'livraison')
  const [quiKind, setQuiKind] = useState(course?.qui_type === 'transporteur' ? 'externe' : 'interne')
  const [form, setForm] = useState({
    date: course?.date ?? defaultDate ?? today(),
    heure_depart: course?.heure_depart ?? '',
    statut: course?.statut ?? 'programmee',
    qui_id: course?.qui_id ?? '',
    quoi: course?.quoi ?? '',
    commentaire: course?.commentaire ?? '',
  })
  const [chantierId, setChantierId] = useState(course?.chantier_id ?? defaultChantierId ?? '')
  const [ouvrages, setOuvrages] = useState([])
  const [ouvrageIds, setOuvrageIds] = useState(course?.ouvrage_ids ?? [])

  // Lieux DE / VERS (livraison, ramasse) — {id,label} ; id 'mzbois' = atelier.
  const [deLieu, setDeLieu] = useState(course?.de_libelle ? { id: course.de_id ?? 'x', label: course.de_libelle } : null)
  const [versLieu, setVersLieu] = useState(course?.vers_libelle ? { id: course.vers_id ?? 'x', label: course.vers_libelle } : null)

  // Étapes de tournée : [{ label, ouvrage_id }].
  const [etapes, setEtapes] = useState(course?.etapes ?? [])
  const [dragIdx, setDragIdx] = useState(null)

  // Champs Admin (0022).
  const [coutHt, setCoutHt] = useState(course?.cout_ht ?? '')
  const [chantierImpute, setChantierImpute] = useState(course?.chantier_impute_id ?? '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Changement de type : bascule Livraison ↔ Ramasse en inversant
  // automatiquement Départ et Arrivée (MZ Bois change de côté, l'adresse
  // saisie passe de l'autre côté).
  function changeType(newType) {
    if (
      (type === 'livraison' && newType === 'ramasse') ||
      (type === 'ramasse' && newType === 'livraison')
    ) {
      setDeLieu(versLieu)
      setVersLieu(deLieu)
    }
    setType(newType)
  }

  // Applique les valeurs MZ Bois par défaut selon le type (si non déjà définies).
  useEffect(() => {
    if (type === 'livraison' && !deLieu) setDeLieu(MZBOIS)
    if (type === 'ramasse' && !versLieu) setVersLieu(MZBOIS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  // Charge les ouvrages du chantier sélectionné (multi-sélection).
  useEffect(() => {
    let active = true
    async function load() {
      if (!chantierId) {
        setOuvrages([])
        return
      }
      const { data } = await supabase
        .from('ouvrages')
        .select('id, nom')
        .eq('chantier_id', chantierId)
        .order('nom')
      if (active) setOuvrages(data ?? [])
    }
    load()
    return () => {
      active = false
    }
  }, [chantierId])

  // Options de lieux pour DE / VERS.
  const lieuOptions = useMemo(
    () => [
      MZBOIS,
      ...chantiers.map((c) => ({ id: c.id, label: `${c.num} · ${c.nom ?? ''}`.trim() })),
      ...fournisseurs.map((f) => ({ id: f.id, label: f.nom })),
    ],
    [chantiers, fournisseurs]
  )
  const chantierOptions = useMemo(
    () => chantiers.map((c) => ({ id: c.id, label: `${c.num} · ${c.nom ?? ''}`.trim() })),
    [chantiers]
  )
  const selectedChantier = chantierOptions.find((c) => c.id === chantierId) ?? null

  // --- Mail coursier externe (pré-rempli) ---
  const TYPE_LABELS = { livraison: 'Livraison', ramasse: 'Ramasse', tournee: 'Tournée' }
  const selectedTransporteur = transporteurs.find((t) => t.id === form.qui_id) ?? null
  const coursierEmail = selectedTransporteur?.contacts?.[0]?.email ?? ''

  function ddmmyyyy(iso) {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  function mailtoCoursier() {
    const chantierCode = chantiers.find((c) => c.id === chantierId)?.num ?? ''
    const dateStr = ddmmyyyy(form.date)
    const typeStr = TYPE_LABELS[type] ?? type
    const depart = type === 'tournee' ? etapes[0]?.label ?? '' : deLieu?.label ?? ''
    const arrivee =
      type === 'tournee' ? etapes[etapes.length - 1]?.label ?? '' : versLieu?.label ?? ''
    const subject = `Course du ${dateStr} — ${typeStr}${chantierCode ? ' — ' + chantierCode : ''}`
    const lignes = [
      'Bonjour,',
      '',
      'Nous faisons appel à vos services pour la course suivante :',
      '',
      `Date : ${dateStr}${form.heure_depart ? ' à ' + form.heure_depart : ''}`,
      `Type : ${typeStr}`,
    ]
    if (type === 'tournee') {
      lignes.push('Étapes : ' + etapes.map((e) => e.label).filter(Boolean).join(' → '))
    } else {
      lignes.push(`De : ${depart}`, `Vers : ${arrivee}`)
    }
    if (chantierCode) lignes.push(`Chantier : ${chantierCode}`)
    if (form.quoi.trim()) lignes.push(`Objet : ${form.quoi.trim()}`)
    if (form.commentaire.trim()) lignes.push('', form.commentaire.trim())
    lignes.push('', 'Merci de confirmer la prise en charge.', '', 'Cordialement,', 'MZ Bois & Compagnie')
    const body = lignes.join('\n')
    return (
      'mailto:' +
      encodeURIComponent(coursierEmail) +
      '?subject=' +
      encodeURIComponent(subject) +
      '&body=' +
      encodeURIComponent(body)
    )
  }

  function toggleOuvrage(id) {
    setOuvrageIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  // --- Étapes de tournée ---
  function addEtape() {
    setEtapes((prev) => [...prev, { label: '', ouvrage_id: '' }])
  }
  function setEtape(i, key, value) {
    setEtapes((prev) => prev.map((e, idx) => (idx === i ? { ...e, [key]: value } : e)))
  }
  function removeEtape(i) {
    setEtapes((prev) => prev.filter((_, idx) => idx !== i))
  }
  function onDrop(i) {
    if (dragIdx == null || dragIdx === i) return
    setEtapes((prev) => {
      const arr = [...prev]
      const [moved] = arr.splice(dragIdx, 1)
      arr.splice(i, 0, moved)
      return arr
    })
    setDragIdx(null)
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    const base = {
      type_course: type,
      date: form.date || null,
      statut: form.statut || null,
      chantier_id: chantierId || null,
      qui_id: form.qui_id || null,
      qui_type: form.qui_id ? (quiKind === 'externe' ? 'transporteur' : 'employe') : null,
      quoi: form.quoi.trim() || null,
      commentaire: form.commentaire.trim() || null,
      ouvrage_ids: ouvrageIds.length ? ouvrageIds : null,
    }
    if (isAdmin) {
      base.cout_ht = coutHt === '' ? null : Number(coutHt)
      base.chantier_impute_id = chantierImpute || null
    }
    if (type === 'tournee') {
      base.etapes = etapes.filter((e) => e.label.trim())
      base.de_id = null
      base.vers_id = null
      base.de_libelle = etapes[0]?.label ?? null
      base.vers_libelle = etapes[etapes.length - 1]?.label ?? null
    } else {
      base.etapes = null
      base.de_id = deLieu && deLieu.id !== 'mzbois' && deLieu.id !== 'x' ? deLieu.id : null
      base.vers_id = versLieu && versLieu.id !== 'mzbois' && versLieu.id !== 'x' ? versLieu.id : null
      base.de_libelle = deLieu?.label ?? null
      base.vers_libelle = versLieu?.label ?? null
    }

    // Champs nouveaux (0021) → repli sur le cœur si colonnes absentes.
    const core = {
      date: base.date,
      statut: base.statut,
      chantier_id: base.chantier_id,
      qui_id: base.qui_id,
      qui_type: base.qui_type,
      quoi: base.quoi,
      commentaire: base.commentaire,
    }

    async function run(payload) {
      if (isEdit) return supabase.from('courses').update(payload).eq('id', course.id)
      return supabase.from('courses').insert(payload)
    }

    let { error: dbError } = await run({ ...base, heure_depart: form.heure_depart || null })
    if (dbError && /heure_depart/.test(dbError.message)) {
      ;({ error: dbError } = await run(base))
    }
    if (
      dbError &&
      /(type_course|etapes|ouvrage_ids|de_libelle|vers_libelle|cout_ht|chantier_impute_id)/.test(dbError.message)
    ) {
      ;({ error: dbError } = await run({ ...core, heure_depart: form.heure_depart || null }))
      if (dbError && /heure_depart/.test(dbError.message)) {
        ;({ error: dbError } = await run(core))
      }
    }
    setSaving(false)
    if (dbError) {
      setError(dbError.message)
      return
    }

    // Traçabilité des modifications Admin (coût, imputation).
    if (isAdmin) {
      await logModifs(
        {
          'coût course (HT)': [course?.cout_ht, base.cout_ht],
          'chantier imputé': [course?.chantier_impute_id, base.chantier_impute_id],
        },
        { table: 'courses', chantierId: base.chantier_id, user }
      )
    }

    toast('Course enregistrée')

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
        <div className="modal-title">{isEdit ? 'Modifier la course' : 'Nouvelle course'}</div>

        {/* Type de course */}
        <div className="fl">
          <label>Type</label>
          <div className="type-toggle">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={'type-btn' + (type === t.id ? ' type-btn--on' : '')}
                onClick={() => changeType(t.id)}
                title={t.hint}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="fg3">
          <div className="fl">
            <label>Date</label>
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div className="fl">
            <label>Heure de départ</label>
            <input type="time" value={form.heure_depart} onChange={(e) => set('heure_depart', e.target.value)} />
          </div>
          <div className="fl">
            <label>Statut</label>
            <SelectSearch
              value={form.statut}
              onChange={(v) => set('statut', v)}
              options={STATUT_COURSE_ORDER.map((s) => ({
                value: s,
                label: STATUT_COURSE[s].label,
              }))}
            />
          </div>
        </div>

        {/* Trajet */}
        {type === 'tournee' ? (
          <div className="fl">
            <label>Étapes de la tournée</label>
            {etapes.length === 0 && <div className="muted" style={{ marginBottom: 6 }}>Aucune étape. Ajoutez le point de départ, les étapes puis l'arrivée.</div>}
            {etapes.map((e, i) => (
              <div
                key={i}
                className="etape-row"
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(ev) => ev.preventDefault()}
                onDrop={() => onDrop(i)}
              >
                <span className="etape-handle" title="Glisser pour réordonner">⋮⋮</span>
                <span className="etape-letter">{String.fromCharCode(65 + i)}</span>
                <div className="etape-fields">
                  <Autocomplete
                    items={lieuOptions}
                    value={e.label ? { id: 'x', label: e.label } : null}
                    onSelect={(v) => setEtape(i, 'label', v?.label ?? '')}
                    getLabel={(o) => o.label}
                    getKey={(o) => o.id}
                    placeholder="Fournisseur / contact / lieu…"
                  />
                  {ouvrages.length > 0 && (
                    <select
                      className="ss"
                      value={e.ouvrage_id ?? ''}
                      onChange={(ev) => setEtape(i, 'ouvrage_id', ev.target.value)}
                    >
                      <option value="">Ouvrage (optionnel)…</option>
                      {ouvrages.map((o) => (
                        <option key={o.id} value={o.id}>{o.nom}</option>
                      ))}
                    </select>
                  )}
                </div>
                <button type="button" className="chip-x" onClick={() => removeEtape(i)}>×</button>
              </div>
            ))}
            <button type="button" className="btn bg bsm" onClick={addEtape} style={{ marginTop: 6 }}>
              + Ajouter une étape
            </button>
          </div>
        ) : (
          <div className="fg">
            <div className="fl">
              <label>Départ {type === 'livraison' && '(MZ Bois par défaut)'}</label>
              <Autocomplete
                items={lieuOptions}
                value={deLieu}
                onSelect={setDeLieu}
                getLabel={(o) => o.label}
                getKey={(o) => o.id}
                placeholder="Lieu de départ…"
              />
            </div>
            <div className="fl">
              <label>Arrivée {type === 'ramasse' && '(MZ Bois par défaut)'}</label>
              <Autocomplete
                items={lieuOptions}
                value={versLieu}
                onSelect={setVersLieu}
                getLabel={(o) => o.label}
                getKey={(o) => o.id}
                placeholder="Lieu d'arrivée…"
              />
            </div>
          </div>
        )}

        {/* Qui */}
        <div className="fl">
          <label>Qui</label>
          <div className="qui-toggle">
            <button type="button" className={'vt' + (quiKind === 'interne' ? ' vt--on' : '')} onClick={() => { setQuiKind('interne'); set('qui_id', '') }}>
              👷 Employé interne
            </button>
            <button type="button" className={'vt' + (quiKind === 'externe' ? ' vt--on' : '')} onClick={() => { setQuiKind('externe'); set('qui_id', '') }}>
              🚚 Coursier externe
            </button>
          </div>
          <SelectSearch
            value={form.qui_id}
            onChange={(v) => set('qui_id', v)}
            options={(quiKind === 'interne' ? employes : transporteurs).map((p) => ({
              value: p.id,
              label: p.prenom ? `${p.prenom} ${p.nom}` : p.nom,
            }))}
            allowEmpty
          />
          {quiKind === 'externe' && form.qui_id && (
            <a
              className="btn bg bsm"
              style={{ marginTop: 6, display: 'inline-block' }}
              href={mailtoCoursier()}
              target="_blank"
              rel="noopener noreferrer"
              title={coursierEmail ? 'Envoyer un mail pré-rempli au coursier' : 'Aucun email renseigné pour ce coursier'}
            >
              📧 Mail coursier
            </a>
          )}
        </div>

        {/* Chantier (autocomplete) + ouvrages */}
        <div className="fl">
          <label>Chantier</label>
          <Autocomplete
            items={chantierOptions}
            value={selectedChantier}
            onSelect={(c) => { setChantierId(c?.id ?? ''); setOuvrageIds([]) }}
            getLabel={(o) => o.label}
            getKey={(o) => o.id}
            placeholder="Rechercher un chantier…"
          />
        </div>

        {chantierId && ouvrages.length > 0 && (
          <div className="fl">
            <label>Ouvrages concernés (optionnel)</label>
            <div className="checkbox-grid">
              {ouvrages.map((o) => (
                <label key={o.id} className="checkbox-label">
                  <input type="checkbox" checked={ouvrageIds.includes(o.id)} onChange={() => toggleOuvrage(o.id)} />
                  {o.nom}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="fl">
          <label>Contenu / quoi</label>
          <input value={form.quoi} onChange={(e) => set('quoi', e.target.value)} placeholder="ex : panneaux, quincaillerie…" />
        </div>

        <div className="fl">
          <label>Commentaire</label>
          <input value={form.commentaire} onChange={(e) => set('commentaire', e.target.value)} />
        </div>

        {isAdmin && (
          <>
            <div className="sl" style={{ marginTop: 8 }}>🗂 Admin — coût &amp; imputation</div>
            <div className="fg">
              <div className="fl">
                <label>Coût HT (€)</label>
                <input type="number" step="0.01" value={coutHt} onChange={(e) => setCoutHt(e.target.value)} />
              </div>
              <div className="fl">
                <label>Chantier imputé</label>
                <SelectSearch
                  value={chantierImpute}
                  onChange={setChantierImpute}
                  options={chantiers.map((c) => ({
                    value: c.id,
                    label: `${c.num} · ${c.nom ?? ''}`.trim(),
                  }))}
                  allowEmpty
                  emptyLabel="— (même que lié)"
                />
              </div>
            </div>
          </>
        )}

        {error && <div className="alert">{error}</div>}

        <div className="modal-actions">
          <button className="btn bp" disabled={saving} onClick={handleSave}>
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
          </button>
          <button className="btn bg" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

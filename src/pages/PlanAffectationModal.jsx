import { useState } from 'react'
import SelectSearch from '../components/SelectSearch'
import { raccourcisModal } from '../lib/clavier'
import { supabase } from '../lib/supabase'
import { PHASE_PLANNING } from '../lib/statuts'
import {
  CRENEAUX,
  CRENEAU_ORDER,
  apresMidiPossible,
  creneauDe,
  heuresDe,
} from '../lib/creneaux'
import Autocomplete from '../components/Autocomplete'

const PHASE_ORDER = ['etude', 'fabrication', 'pose']

// Création d'une affectation de planning.
// - salarie fourni  => salarié fixe (vue Salariés), on choisit chantier + phase.
// - prefill { chantier_id, phase } => chantier/phase fixes (vue Chantiers),
//   on choisit le salarié.
export default function PlanAffectationModal({
  chantiers,
  salaries = [],
  salarie,
  prefill,
  affectation,
  initialDate,
  initialCreneau,
  onClose,
  onSaved,
}) {
  const isEdit = Boolean(affectation)
  const [form, setForm] = useState({
    chantier_id: affectation?.chantier_id ?? prefill?.chantier_id ?? '',
    phase: affectation?.phase ?? prefill?.phase ?? 'fabrication',
    sal_id: affectation?.sal_id ?? salarie?.id ?? '',
    date_debut: affectation?.date_debut ?? initialDate ?? '',
    date_fin: affectation?.date_fin ?? initialDate ?? '',
    commentaire: affectation?.commentaire ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Créneau demi-journée, déduit des horaires enregistrés (journee | matin | apres).
  const [creneau, setCreneau] = useState(
    affectation
      ? creneauDe(affectation.heure_debut, affectation.heure_fin)
      : initialCreneau ?? 'journee'
  )

  function setDateDebut(value) {
    set('date_debut', value)
    // L'après-midi n'existe pas le vendredi : on retombe sur la journée.
    if (creneau === 'apres' && !apresMidiPossible(value)) setCreneau('journee')
  }

  const chantierFixed = Boolean(prefill?.chantier_id)
  const salarieFixed = Boolean(salarie)

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const chById = Object.fromEntries(chantiers.map((c) => [c.id, c]))
  const selectedCh = chById[form.chantier_id]

  async function handleSave() {
    if (!form.chantier_id) return setError('Le chantier est obligatoire.')
    if (!form.sal_id) return setError('Le salarié est obligatoire.')
    if (!form.date_debut || !form.date_fin)
      return setError('Les dates de début et de fin sont obligatoires.')
    if (form.date_fin < form.date_debut)
      return setError('La date de fin doit être après la date de début.')
    setSaving(true)
    setError('')
    const base = {
      chantier_id: form.chantier_id,
      phase: form.phase || null,
      sal_id: form.sal_id,
      date_debut: form.date_debut,
      date_fin: form.date_fin,
      commentaire: form.commentaire.trim() || null,
    }
    // Le créneau se traduit en horaires (prévu). Journée = pas d'horaire.
    const h = heuresDe(creneau, form.date_debut)
    const withHours = { ...base, heure_debut: h.debut, heure_fin: h.fin }

    async function run(payload) {
      if (isEdit) return supabase.from('plan_affectations').update(payload).eq('id', affectation.id)
      return supabase.from('plan_affectations').insert(payload)
    }
    // Tente avec les horaires ; repli sans si les colonnes n'existent pas (migration 0011).
    let { error: dbError } = await run(withHours)
    if (dbError && /heure_/.test(dbError.message)) {
      ;({ error: dbError } = await run(base))
    }
    setSaving(false)
    if (dbError) return setError(dbError.message)
    onSaved()
  }

  const title = isEdit
    ? 'Modifier l’affectation'
    : salarieFixed
    ? `Affecter — ${salarie.prenom} ${salarie.nom}`
    : 'Nouvelle affectation'

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
        <div className="modal-title">{title}</div>

        <div className="fl">
          <label>Chantier *</label>
          {chantierFixed || selectedCh ? (
            <div className="chip-row">
              <span className="chip-select">
                {selectedCh ? `${selectedCh.num} · ${selectedCh.nom}` : '—'}
                {!chantierFixed && (
                  <button type="button" className="chip-x" onClick={() => set('chantier_id', '')}>
                    ×
                  </button>
                )}
              </span>
            </div>
          ) : (
            <Autocomplete
              items={chantiers}
              value={null}
              onSelect={(c) => c && set('chantier_id', c.id)}
              getLabel={(c) => `${c.num} · ${c.nom ?? ''}`.trim()}
              getKey={(c) => c.id}
              placeholder="🔍 Rechercher un chantier (n° ou mot)…"
            />
          )}
        </div>

        <div className="fl">
          <label>Phase</label>
          <SelectSearch
            value={form.phase}
            onChange={(v) => set('phase', v)}
            options={PHASE_ORDER.map((slug) => ({
              value: slug,
              label: PHASE_PLANNING[slug].label,
            }))}
          />
        </div>

        <div className="fl">
          <label>Salarié *</label>
          {salarieFixed ? (
            <div className="chip-row">
              <span className="chip-select">{salarie.prenom} {salarie.nom}</span>
            </div>
          ) : (
            <Autocomplete
              items={salaries}
              value={salaries.find((s) => s.id === form.sal_id) ?? null}
              onSelect={(s) => set('sal_id', s?.id ?? '')}
              getLabel={(s) => `${s.prenom} ${s.nom}`}
              getKey={(s) => s.id}
              placeholder="🔍 Rechercher un salarié…"
            />
          )}
        </div>

        <div className="fg">
          <div className="fl">
            <label>Début *</label>
            <input type="date" value={form.date_debut} onChange={(e) => setDateDebut(e.target.value)} />
          </div>
          <div className="fl">
            <label>Fin *</label>
            <input type="date" value={form.date_fin} onChange={(e) => set('date_fin', e.target.value)} />
          </div>
        </div>

        <div className="fl">
          <label>Créneau</label>
          <div className="creneau-seg" role="group" aria-label="Créneau">
            {CRENEAU_ORDER.map((c) => {
              const indispo = c === 'apres' && !apresMidiPossible(form.date_debut)
              return (
                <button
                  key={c}
                  type="button"
                  className={'creneau-opt' + (creneau === c ? ' creneau-opt--on' : '')}
                  disabled={indispo}
                  title={indispo ? 'Pas d’après-midi le vendredi' : undefined}
                  onClick={() => setCreneau(c)}
                >
                  {CRENEAUX[c].label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="fl">
          <label>Commentaire</label>
          <input value={form.commentaire} onChange={(e) => set('commentaire', e.target.value)} />
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-actions">
          <button className="btn bp" disabled={saving} onClick={handleSave}>
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Affecter'}
          </button>
          <button className="btn bg" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

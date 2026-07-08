import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { PHASE_PLANNING } from '../lib/statuts'

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
  initialDate,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    chantier_id: prefill?.chantier_id ?? '',
    phase: prefill?.phase ?? 'fabrication',
    sal_id: salarie?.id ?? '',
    date_debut: initialDate ?? '',
    date_fin: initialDate ?? '',
    commentaire: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [chSearch, setChSearch] = useState('')
  const [chOpen, setChOpen] = useState(false)

  const chantierFixed = Boolean(prefill?.chantier_id)
  const salarieFixed = Boolean(salarie)

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const chById = Object.fromEntries(chantiers.map((c) => [c.id, c]))
  const selectedCh = chById[form.chantier_id]
  const chQuery = chSearch.trim().toLowerCase()
  const chSuggestions = chantiers
    .filter(
      (c) =>
        !chQuery ||
        (c.num ?? '').toLowerCase().includes(chQuery) ||
        (c.nom ?? '').toLowerCase().includes(chQuery)
    )
    .slice(0, 8)

  async function handleSave() {
    if (!form.chantier_id) return setError('Le chantier est obligatoire.')
    if (!form.sal_id) return setError('Le salarié est obligatoire.')
    if (!form.date_debut || !form.date_fin)
      return setError('Les dates de début et de fin sont obligatoires.')
    if (form.date_fin < form.date_debut)
      return setError('La date de fin doit être après la date de début.')
    setSaving(true)
    setError('')
    const { error: dbError } = await supabase.from('plan_affectations').insert({
      chantier_id: form.chantier_id,
      phase: form.phase || null,
      sal_id: form.sal_id,
      date_debut: form.date_debut,
      date_fin: form.date_fin,
      commentaire: form.commentaire.trim() || null,
    })
    setSaving(false)
    if (dbError) return setError(dbError.message)
    onSaved()
  }

  const title = salarieFixed
    ? `Affecter — ${salarie.prenom} ${salarie.nom}`
    : 'Nouvelle affectation'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
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
            <div className="autocomplete">
              <input
                value={chSearch}
                placeholder="🔍 Rechercher un chantier (n° ou mot)…"
                onChange={(e) => {
                  setChSearch(e.target.value)
                  setChOpen(true)
                }}
                onFocus={() => setChOpen(true)}
                onBlur={() => setTimeout(() => setChOpen(false), 150)}
              />
              {chOpen && chSuggestions.length > 0 && (
                <div className="autocomplete-list">
                  {chSuggestions.map((c) => (
                    <div
                      key={c.id}
                      className="autocomplete-item"
                      onMouseDown={() => {
                        set('chantier_id', c.id)
                        setChSearch('')
                        setChOpen(false)
                      }}
                    >
                      {c.num} · {c.nom}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="fl">
          <label>Phase</label>
          <select value={form.phase} onChange={(e) => set('phase', e.target.value)}>
            {PHASE_ORDER.map((slug) => (
              <option key={slug} value={slug}>
                {PHASE_PLANNING[slug].label}
              </option>
            ))}
          </select>
        </div>

        <div className="fl">
          <label>Salarié *</label>
          <select
            value={form.sal_id}
            onChange={(e) => set('sal_id', e.target.value)}
            disabled={salarieFixed}
          >
            <option value="">—</option>
            {(salarieFixed ? [salarie] : salaries).map((em) => (
              <option key={em.id} value={em.id}>
                {em.prenom} {em.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="fg">
          <div className="fl">
            <label>Début *</label>
            <input type="date" value={form.date_debut} onChange={(e) => set('date_debut', e.target.value)} />
          </div>
          <div className="fl">
            <label>Fin *</label>
            <input type="date" value={form.date_fin} onChange={(e) => set('date_fin', e.target.value)} />
          </div>
        </div>

        <div className="fl">
          <label>Commentaire</label>
          <input value={form.commentaire} onChange={(e) => set('commentaire', e.target.value)} />
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-actions">
          <button className="btn bp" disabled={saving} onClick={handleSave}>
            {saving ? 'Enregistrement…' : 'Affecter'}
          </button>
          <button className="btn bg" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

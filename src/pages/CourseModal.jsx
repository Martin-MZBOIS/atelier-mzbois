import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { STATUT_COURSE, STATUT_COURSE_ORDER } from '../lib/statuts'

function today() {
  return new Date().toISOString().slice(0, 10)
}

// Création d'une course. Champs cœur ; les lieux DE/VERS (polymorphes) sont
// différés pour l'instant.
export default function CourseModal({ chantiers, employes, onClose, onSaved }) {
  const [form, setForm] = useState({
    date: today(),
    statut: 'programmee',
    chantier_id: '',
    qui_id: '',
    quoi: '',
    commentaire: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.quoi.trim()) {
      setError('Le champ « quoi » est obligatoire.')
      return
    }
    setSaving(true)
    setError('')
    const { error: dbError } = await supabase.from('courses').insert({
      date: form.date || null,
      statut: form.statut || null,
      chantier_id: form.chantier_id || null,
      qui_id: form.qui_id || null,
      qui_type: form.qui_id ? 'employe' : null,
      quoi: form.quoi.trim(),
      commentaire: form.commentaire.trim() || null,
    })
    setSaving(false)
    if (dbError) {
      setError(dbError.message)
      return
    }
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="modal-title">Nouvelle course</div>

        <div className="fg">
          <div className="fl">
            <label>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>
          <div className="fl">
            <label>Statut</label>
            <select
              value={form.statut}
              onChange={(e) => set('statut', e.target.value)}
            >
              {STATUT_COURSE_ORDER.map((slug) => (
                <option key={slug} value={slug}>
                  {STATUT_COURSE[slug].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="fg">
          <div className="fl">
            <label>Chantier</label>
            <select
              value={form.chantier_id}
              onChange={(e) => set('chantier_id', e.target.value)}
            >
              <option value="">—</option>
              {chantiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.num} · {c.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="fl">
            <label>Qui (employé)</label>
            <select
              value={form.qui_id}
              onChange={(e) => set('qui_id', e.target.value)}
            >
              <option value="">—</option>
              {employes.map((em) => (
                <option key={em.id} value={em.id}>
                  {em.prenom} {em.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="fl">
          <label>Quoi *</label>
          <input value={form.quoi} onChange={(e) => set('quoi', e.target.value)} />
        </div>

        <div className="fl">
          <label>Commentaire</label>
          <input
            value={form.commentaire}
            onChange={(e) => set('commentaire', e.target.value)}
          />
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-actions">
          <button className="btn bp" disabled={saving} onClick={handleSave}>
            {saving ? 'Enregistrement…' : 'Créer'}
          </button>
          <button className="btn bg" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

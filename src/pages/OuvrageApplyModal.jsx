import { useState } from 'react'

// Applique une valeur commune à tous les ouvrages du chantier.
// mode 'depart' : une date de départ atelier.
// mode 'pose'   : une date de pose + un poseur.
export default function OuvrageApplyModal({ mode, employes, onApply, onClose }) {
  const [date, setDate] = useState('')
  const [poseur, setPoseur] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isPose = mode === 'pose'

  async function handleApply() {
    if (!date) {
      setError('La date est obligatoire.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onApply({ date, poseur: poseur || null })
    } catch (e) {
      setError(e.message ?? String(e))
      setSaving(false)
      return
    }
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="modal-title">
          {isPose ? 'Pose → tous les ouvrages' : 'Départ → tous les ouvrages'}
        </div>

        <div className="fl">
          <label>{isPose ? 'Date de pose *' : 'Date de départ atelier *'}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
        </div>

        {isPose && (
          <div className="fl">
            <label>Poseur</label>
            <select value={poseur} onChange={(e) => setPoseur(e.target.value)}>
              <option value="">—</option>
              {employes.map((em) => (
                <option key={em.id} value={em.id}>
                  {em.prenom} {em.nom}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <div className="alert">{error}</div>}

        <div className="modal-actions">
          <button className="btn bp" disabled={saving} onClick={handleApply}>
            {saving ? 'Application…' : 'Appliquer'}
          </button>
          <button className="btn bg" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { supabase } from '../lib/supabase'

function num(v) {
  if (v === '' || v == null) return 0
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

// Édition des données analytiques d'un chantier.
export default function AnalytiqueModal({ chantierId, initial, onClose, onSaved }) {
  const [hv, setHv] = useState(initial.heures_vendues ?? 0)
  const [hr, setHr] = useState(initial.heures_realisees ?? 0)
  const [fv, setFv] = useState(initial.fournitures_vendues ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    const { error: dbError } = await supabase
      .from('chantiers')
      .update({
        heures_vendues: num(hv),
        heures_realisees: num(hr),
        fournitures_vendues: num(fv),
      })
      .eq('id', chantierId)
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
        <div className="modal-title">Données analytiques</div>

        <div className="fg">
          <div className="fl">
            <label>Heures vendues</label>
            <input type="number" min="0" value={hv} onChange={(e) => setHv(e.target.value)} />
          </div>
          <div className="fl">
            <label>Heures réalisées</label>
            <input type="number" min="0" value={hr} onChange={(e) => setHr(e.target.value)} />
          </div>
        </div>
        <div className="fl">
          <label>Fournitures vendues (€ HT)</label>
          <input type="number" min="0" step="0.01" value={fv} onChange={(e) => setFv(e.target.value)} />
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

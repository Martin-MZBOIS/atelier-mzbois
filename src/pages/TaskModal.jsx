import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Création rapide d'une tâche depuis le tableau de bord.
export default function TaskModal({ chantiers, employes, onClose, onSaved }) {
  const [texte, setTexte] = useState('')
  const [chantierId, setChantierId] = useState('')
  const [assigneA, setAssigneA] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!texte.trim()) {
      setError('Le texte est obligatoire.')
      return
    }
    setSaving(true)
    setError('')
    const { error: dbError } = await supabase.from('taches').insert({
      texte: texte.trim(),
      done: false,
      chantier_id: chantierId || null,
      assigne_a: assigneA || null,
      source: 'perso',
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
        <div className="modal-title">Nouvelle tâche</div>

        <div className="fl">
          <label>Texte *</label>
          <input value={texte} onChange={(e) => setTexte(e.target.value)} autoFocus />
        </div>

        <div className="fg">
          <div className="fl">
            <label>Chantier</label>
            <select value={chantierId} onChange={(e) => setChantierId(e.target.value)}>
              <option value="">—</option>
              {chantiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.num}
                </option>
              ))}
            </select>
          </div>
          <div className="fl">
            <label>Assigner à</label>
            <select value={assigneA} onChange={(e) => setAssigneA(e.target.value)}>
              <option value="">—</option>
              {employes.map((em) => (
                <option key={em.id} value={em.id}>
                  {em.prenom} {em.nom}
                </option>
              ))}
            </select>
          </div>
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

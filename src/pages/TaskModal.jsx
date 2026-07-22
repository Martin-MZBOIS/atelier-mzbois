import { useState } from 'react'
import SelectSearch from '../components/SelectSearch'
import { raccourcisModal } from '../lib/clavier'
import { supabase } from '../lib/supabase'
import { toast } from '../store/toasts'

// Création rapide d'une tâche depuis le tableau de bord.
//
// `defaultAssigneA` : employé pré-sélectionné. Le bloc « Mes tâches » n'affiche
// que les tâches qui vous sont assignées — sans ce défaut, une tâche créée
// depuis ce bloc partait sans destinataire et disparaissait aussitôt de la vue.
export default function TaskModal({
  chantiers,
  employes,
  defaultAssigneA = '',
  onClose,
  onSaved,
}) {
  const [texte, setTexte] = useState('')
  const [chantierId, setChantierId] = useState('')
  const [assigneA, setAssigneA] = useState(defaultAssigneA ?? '')
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
      toast.error('Tâche non créée : ' + dbError.message)
      return
    }
    // On dit à qui elle revient : si ce n'est pas vous, elle n'apparaîtra pas
    // dans « Mes tâches », et il vaut mieux le savoir tout de suite.
    const dest = employes.find((e) => e.id === assigneA)
    const pourMoi = assigneA && assigneA === defaultAssigneA
    toast(
      !assigneA
        ? 'Tâche créée (non assignée)'
        : pourMoi
          ? 'Tâche créée'
          : `Tâche créée pour ${dest ? dest.prenom : 'un collaborateur'}`
    )
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
        <div className="modal-title">Nouvelle tâche</div>

        <div className="fl">
          <label>Texte *</label>
          <input value={texte} onChange={(e) => setTexte(e.target.value)} autoFocus />
        </div>

        <div className="fg">
          <div className="fl">
            <label>Chantier</label>
            <SelectSearch
              value={chantierId}
              onChange={setChantierId}
              options={chantiers.map((c) => ({ value: c.id, label: c.num }))}
              allowEmpty
            />
          </div>
          <div className="fl">
            <label>Assigner à</label>
            <SelectSearch
              value={assigneA}
              onChange={setAssigneA}
              options={employes.map((em) => ({
                value: em.id,
                label: `${em.prenom} ${em.nom}${em.id === defaultAssigneA ? ' (moi)' : ''}`,
              }))}
              allowEmpty
              emptyLabel="— Personne —"
            />
            {!assigneA && (
              <div className="param-hint" style={{ marginTop: 5 }}>
                Sans destinataire, la tâche n’apparaîtra dans « Mes tâches » de
                personne.
              </div>
            )}
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

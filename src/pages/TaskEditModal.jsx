import { useState } from 'react'
import SelectSearch from '../components/SelectSearch'
import { raccourcisModal } from '../lib/clavier'
import { supabase } from '../lib/supabase'
import { toast } from '../store/toasts'

// Détail / édition d'une tâche.
export default function TaskEditModal({ task, chantiers, employes, onClose, onSaved }) {
  const [form, setForm] = useState({
    texte: task.texte ?? '',
    chantier_id: task.chantier?.id ?? task.chantier_id ?? '',
    assigne_a: task.employe?.id ?? task.assigne_a ?? '',
    echeance: task.echeance ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.texte.trim()) {
      setError('Le texte est obligatoire.')
      return
    }
    setSaving(true)
    setError('')
    const { error: dbError } = await supabase
      .from('taches')
      .update({
        texte: form.texte.trim(),
        chantier_id: form.chantier_id || null,
        assigne_a: form.assigne_a || null,
        echeance: form.echeance || null,
      })
      .eq('id', task.id)
    setSaving(false)
    if (dbError) {
      setError(dbError.message)
      toast.error('Tâche non enregistrée : ' + dbError.message)
      return
    }
    toast(
      form.assigne_a ? 'Tâche mise à jour' : 'Tâche mise à jour (plus assignée à personne)'
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
        <div className="modal-title">Détail de la tâche</div>

        <div className="fl">
          <label>Texte *</label>
          <textarea
            className="ni"
            rows="2"
            value={form.texte}
            onChange={(e) => set('texte', e.target.value)}
            autoFocus
          />
        </div>

        <div className="fg">
          <div className="fl">
            <label>Chantier lié</label>
            <SelectSearch
              value={form.chantier_id}
              onChange={(v) => set('chantier_id', v)}
              options={chantiers.map((c) => ({ value: c.id, label: c.num }))}
              allowEmpty
            />
          </div>
          <div className="fl">
            <label>Assigné à</label>
            <SelectSearch
              value={form.assigne_a}
              onChange={(v) => set('assigne_a', v)}
              options={employes.map((e) => ({ value: e.id, label: e.prenom + ' ' + e.nom }))}
              allowEmpty
              emptyLabel="— Personne —"
            />
          </div>
        </div>

        <div className="fl">
          <label>Échéance</label>
          <input type="date" value={form.echeance} onChange={(e) => set('echeance', e.target.value)} />
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

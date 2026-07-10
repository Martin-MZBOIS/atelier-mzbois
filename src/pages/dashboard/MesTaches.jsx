import { forwardRef, useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../lib/useRealtime'
import { useSettings } from '../../store/settings'
import { daysSince, taskAge } from '../../lib/dashboard'
import TaskModal from '../TaskModal'
import TaskEditModal from '../TaskEditModal'

// Bloc « Mes tâches ».
// employeId : si fourni, seules les tâches assignées à cet employé sont
// affichées. Sinon (utilisateur sans fiche employé) on affiche toutes les
// tâches, et le titre le dit honnêtement.
const MesTaches = forwardRef(function MesTaches({ employeId }, ref) {
  const ageWarn = useSettings((s) => s.alerte_orange)
  const ageLate = useSettings((s) => s.alerte_rouge)

  const [taches, setTaches] = useState([])
  const [chantiers, setChantiers] = useState([])
  const [employes, setEmployes] = useState([])
  const [view, setView] = useState('pending')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    let q = supabase
      .from('taches')
      .select(
        'id, texte, done, created_at, source, echeance, assigne_a, ' +
          'chantier:chantiers!chantier_id(id, num), ' +
          'employe:employes!assigne_a(id, prenom)'
      )
      .order('created_at', { ascending: true })
    if (employeId) q = q.eq('assigne_a', employeId)
    const { data } = await q
    setTaches(data ?? [])
  }, [employeId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('chantiers').select('id, num').order('num'),
      supabase.from('employes').select('id, prenom, nom').order('nom'),
    ]).then(([ch, em]) => {
      if (!active) return
      setChantiers(ch.data ?? [])
      setEmployes(em.data ?? [])
    })
    return () => {
      active = false
    }
  }, [])

  useRealtime('taches', load)

  const pending = taches.filter((t) => !t.done)
  const done = taches.filter((t) => t.done)
  const shown = view === 'done' ? done : pending

  async function toggle(t) {
    const { error } = await supabase.from('taches').update({ done: !t.done }).eq('id', t.id)
    if (!error) load()
  }
  async function remove(id) {
    const { error } = await supabase.from('taches').delete().eq('id', id)
    if (!error) load()
  }

  return (
    <div className="card" ref={ref}>
      <div className="card-head">
        <span className="card-title">{employeId ? 'Mes tâches' : 'Tâches'}</span>
        <div className="card-actions">
          <div className="view-toggle">
            <button
              className={'vt' + (view === 'pending' ? ' vt--on' : '')}
              onClick={() => setView('pending')}
            >
              En attente ({pending.length})
            </button>
            <button
              className={'vt' + (view === 'done' ? ' vt--on' : '')}
              onClick={() => setView('done')}
            >
              Terminées ({done.length})
            </button>
          </div>
          <button className="btn bp bsm" onClick={() => setShowAdd(true)}>
            + Tâche
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          {view === 'done' ? 'Aucune tâche terminée' : '✓ Aucune tâche en attente'}
        </div>
      ) : (
        shown.map((t) => {
          const age = taskAge(t, ageWarn, ageLate)
          const d = daysSince(t.created_at)
          return (
            <div key={t.id} className={'task-item task-item--' + (t.done ? 'done' : age)}>
              <input type="checkbox" checked={t.done} onChange={() => toggle(t)} />
              <div className="task-body task-body--click" onClick={() => setEditing(t)}>
                <div className={'task-text' + (t.done ? ' task-text--done' : '')}>{t.texte}</div>
                <div className="task-meta">
                  {t.chantier && <span className="task-num mono">{t.chantier.num}</span>}
                  {t.source === 'reunion' && <span className="task-tag">📋 Réunion de chantiers</span>}
                  {t.employe && <span className="task-assignee">👤 {t.employe.prenom}</span>}
                  {!t.done && d > 0 && <span className={'task-age task-age--' + age}>{d}j</span>}
                </div>
              </div>
              <button className="task-del" onClick={() => remove(t.id)}>✕</button>
            </div>
          )
        })
      )}

      {showAdd && (
        <TaskModal
          chantiers={chantiers}
          employes={employes}
          onClose={() => setShowAdd(false)}
          onSaved={async () => {
            setShowAdd(false)
            await load()
          }}
        />
      )}
      {editing && (
        <TaskEditModal
          task={editing}
          chantiers={chantiers}
          employes={employes}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await load()
          }}
        />
      )}
    </div>
  )
})

export default MesTaches

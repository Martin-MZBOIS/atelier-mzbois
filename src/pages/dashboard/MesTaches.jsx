import { forwardRef, useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../lib/useRealtime'
import { useSettings } from '../../store/settings'
import { toast } from '../../store/toasts'
import { daysSince, taskAge } from '../../lib/dashboard'
import { formatDate } from '../../lib/format'
import EmptyState from '../../components/EmptyState'
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
    const jointures =
      'chantier:chantiers!chantier_id(id, num), employe:employes!assigne_a(id, prenom)'
    const avecDate = `id, texte, done, created_at, termine_le, source, echeance, assigne_a, ${jointures}`
    const sansDate = `id, texte, done, created_at, source, echeance, assigne_a, ${jointures}`

    const requete = (champs) => {
      let q = supabase.from('taches').select(champs).order('created_at', { ascending: true })
      if (employeId) q = q.eq('assigne_a', employeId)
      return q
    }
    // Repli si la colonne termine_le (migration 0028) n'existe pas encore.
    let { data, error } = await requete(avecDate)
    if (error && /termine_le/.test(error.message)) {
      ;({ data } = await requete(sansDate))
    }
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
    const done = !t.done
    // On horodate la réalisation, et on efface la date si la tâche est
    // rouverte. Repli si la colonne (migration 0028) n'existe pas encore.
    let { error } = await supabase
      .from('taches')
      .update({ done, termine_le: done ? new Date().toISOString() : null })
      .eq('id', t.id)
    if (error && /termine_le/.test(error.message)) {
      ;({ error } = await supabase.from('taches').update({ done }).eq('id', t.id))
    }
    if (error) toast.error(error.message)
    else {
      toast(done ? 'Tâche terminée' : 'Tâche rouverte')
      load()
    }
  }
  async function remove(id) {
    const { error } = await supabase.from('taches').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast('Tâche supprimée'); load() }
  }

  return (
    <div className="card" id="taches" ref={ref}>
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
        view === 'done' ? (
          <EmptyState
            ico="✓"
            titre="Aucune tâche terminée pour l'instant"
            aide="Les tâches que vous cochez viendront s'archiver ici."
          />
        ) : (
          <EmptyState
            ico="🎉"
            titre="Rien en attente, tout est à jour"
            action={{ label: '+ Créer une tâche', onClick: () => setShowAdd(true) }}
          />
        )
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
                  {t.done && (
                    <span className="task-fait">
                      {t.termine_le
                        ? 'Terminée le ' + formatDate(t.termine_le)
                        : 'Terminée (date inconnue)'}
                    </span>
                  )}
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
          defaultAssigneA={employeId ?? ''}
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

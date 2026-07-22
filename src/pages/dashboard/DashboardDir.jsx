import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../store/settings'
import { useMonEmploye } from '../../lib/useMonEmploye'
import { CLOS, daysSince, daysUntil, taskAge } from '../../lib/dashboard'
import Alertes from './Alertes'
import DashHeader from './DashHeader'
import MeteoCard from './MeteoCard'
import KpiChantiers from './KpiChantiers'
import CopilCard from './CopilCard'
import MesTaches from './MesTaches'
import FilActualite from './FilActualite'

const RECENT_DAYS = 7

// Un chantier est « bloqué » quand sa dernière réunion date de plus d'une
// semaine et qu'il lui reste des actions non faites (mêmes règles que COPIL).
function chantiersBloques(reunions) {
  const derniere = {}
  for (const r of reunions) {
    const cur = derniere[r.chantier_id]
    if (!cur || (r.date ?? '') > (cur.date ?? '')) derniere[r.chantier_id] = r
  }
  return Object.values(derniere).filter((r) => {
    const actions = r.reunion_actions ?? []
    return daysSince(r.date) > RECENT_DAYS && actions.some((a) => !a.done)
  })
}

export default function DashboardDir() {
  const navigate = useNavigate()
  const { employeId } = useMonEmploye()
  const ageWarn = useSettings((s) => s.alerte_orange)
  const ageLate = useSettings((s) => s.alerte_rouge)
  const tasksRef = useRef(null)

  const [d, setD] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const [ouv, ach, fb, reu, ch] = await Promise.all([
        supabase.from('ouvrages').select('id, statut, dep, chantier_id'),
        supabase.from('achats').select('id, st'),
        supabase.from('feedbacks').select('id, statut, date'),
        supabase.from('reunions').select('chantier_id, date, reunion_actions(done)'),
        supabase.from('chantiers').select('id, num').order('num'),
      ])
      const err = [ouv, ach, fb, reu, ch].find((r) => r.error)
      if (!active) return
      if (err) {
        setError(err.error.message)
        return
      }
      let taches = []
      if (employeId) {
        const t = await supabase
          .from('taches')
          .select('id, done, created_at')
          .eq('assigne_a', employeId)
        taches = t.data ?? []
      }
      if (!active) return
      setD({
        ouvrages: ouv.data ?? [],
        achats: ach.data ?? [],
        feedbacks: fb.data ?? [],
        reunions: reu.data ?? [],
        chantiers: ch.data ?? [],
        taches,
      })
    }
    load()
    return () => {
      active = false
    }
  }, [employeId])

  if (error)
    return (
      <section className="page">
        <div className="alert"><strong>Erreur :</strong> {error}</div>
      </section>
    )
  if (!d)
    return (
      <section className="page">
        <p className="muted">Chargement…</p>
      </section>
    )

  const depUrgents = d.ouvrages.filter(
    (o) => o.dep && daysUntil(o.dep) <= 7 && !CLOS.includes(o.statut)
  )
  const aCommander = d.achats.filter((a) => a.st === 'a_commander')
  const tachesEnRetard = d.taches.filter(
    (t) => !t.done && taskAge(t, ageWarn, ageLate) === 'late'
  )
  const fbVieux = d.feedbacks.filter(
    (f) => f.statut !== 'resolu' && daysSince(f.date) > 7
  )
  const bloques = chantiersBloques(d.reunions)

  const alertes = []
  if (depUrgents.length)
    alertes.push({
      ico: '🚨',
      txt: `${depUrgents.length} départ${depUrgents.length > 1 ? 's' : ''} atelier dans moins de 7 jours`,
      onClick: () => navigate('/chantiers'),
    })
  if (aCommander.length)
    alertes.push({
      ico: '⚠️', tone: 'orange',
      txt: `${aCommander.length} achat${aCommander.length > 1 ? 's' : ''} à commander`,
      onClick: () => navigate('/achats', { state: { quick: 'traiter' } }),
    })
  if (tachesEnRetard.length)
    alertes.push({
      ico: '🔴',
      txt: `${tachesEnRetard.length} tâche${tachesEnRetard.length > 1 ? 's' : ''} en retard`,
      onClick: () => tasksRef.current?.scrollIntoView({ behavior: 'smooth' }),
    })
  if (fbVieux.length)
    alertes.push({
      ico: '🔧',
      txt: `${fbVieux.length} feedback${fbVieux.length > 1 ? 's' : ''} non résolu${fbVieux.length > 1 ? 's' : ''} depuis plus de 7 jours`,
      onClick: () => navigate('/chantiers'),
    })
  if (bloques.length)
    alertes.push({
      ico: '⛔',
      txt: `${bloques.length} chantier${bloques.length > 1 ? 's' : ''} bloqué${bloques.length > 1 ? 's' : ''} (actions de réunion en retard)`,
      onClick: () => navigate('/copil?o=chantiers'),
    })

  return (
    <section className="page">
      <DashHeader />

      <Alertes items={alertes} />

      {/* Les indicateurs passent en premier : c'est ce qu'on lit d'un coup d'œil. */}
      <KpiChantiers chantiers={d.chantiers} ouvrages={d.ouvrages} />

      <div className="dash-grid">
        <MesTaches ref={tasksRef} employeId={employeId} />
        <div className="dash-stack">
          <MeteoCard />
          <CopilCard />
        </div>
        <FilActualite />
      </div>
    </section>
  )
}

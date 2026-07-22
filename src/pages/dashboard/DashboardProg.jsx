import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../store/settings'
import { useMonEmploye } from '../../lib/useMonEmploye'
import { daysUntil, ouvrirAlerte, tacheEnRetard, taskAge } from '../../lib/dashboard'
import { formatDate } from '../../lib/format'
import { STATUT_OUVRAGE, resolve } from '../../lib/statuts'
import Alertes from './Alertes'
import { SkelPage } from '../../components/Skeleton'
import DashHeader from './DashHeader'
import MesTaches from './MesTaches'
import MiniPlanning from './MiniPlanning'

// Statuts qui précèdent la programmation.
const A_VENIR = ['validation_client', 'en_attente']

// Tri par date de départ atelier ; les ouvrages sans date passent en dernier.
function parDepart(a, b) {
  if (!a.dep) return 1
  if (!b.dep) return -1
  return a.dep < b.dep ? -1 : a.dep > b.dep ? 1 : 0
}

function LigneOuvrage({ o, onClick }) {
  const st = resolve(STATUT_OUVRAGE, o.statut)
  const d = o.dep ? daysUntil(o.dep) : null
  return (
    <div className="dash-line" onClick={onClick}>
      <div className="dash-line-body">
        <div className="dash-line-lbl">{o.nom}</div>
        <div className="dash-line-sub">
          <span className="mono">{o.chantier?.num}</span>
          {o.dep && ` · 📅 ${formatDate(o.dep)}`}
          {d != null && d >= 0 && ` · dans ${d}j`}
          {d != null && d < 0 && ' · en retard'}
        </div>
      </div>
      <span className="aspill" style={{ color: st.color, backgroundColor: st.color + '22' }}>
        {st.label}
      </span>
    </div>
  )
}

export default function DashboardProg() {
  const navigate = useNavigate()
  const { employe, employeId } = useMonEmploye()
  const ageWarn = useSettings((s) => s.alerte_orange)
  const ageLate = useSettings((s) => s.alerte_rouge)
  const tasksRef = useRef(null)

  const [d, setD] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error: err } = await supabase
        .from('ouvrages')
        .select('id, nom, statut, dep, chantier:chantiers!chantier_id(id, num)')
        .in('statut', ['prog_a_faire', ...A_VENIR])
      if (!active) return
      if (err) {
        setError(err.message)
        return
      }
      let taches = []
      if (employeId) {
        const t = await supabase
          .from('taches')
          .select('id, done, created_at, echeance')
          .eq('assigne_a', employeId)
        taches = t.data ?? []
      }
      if (!active) return
      setD({ ouvrages: data ?? [], taches })
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
        <SkelPage cards={2} rows={3} />
      </section>
    )

  const aProgrammer = d.ouvrages.filter((o) => o.statut === 'prog_a_faire').sort(parDepart)
  const aVenir = d.ouvrages
    .filter((o) => A_VENIR.includes(o.statut) && o.dep && daysUntil(o.dep) <= 30)
    .sort(parDepart)

  const urgents = aProgrammer.filter((o) => o.dep && daysUntil(o.dep) <= 14)
  const tachesEnRetard = d.taches.filter(tacheEnRetard)
  // Distinct du retard : ouvertes depuis longtemps, échéance ou non.
  const tachesQuiTrainent = d.taches.filter(
    (t) => !t.done && !tacheEnRetard(t) && taskAge(t, ageWarn, ageLate) === 'late'
  )

  const alertes = []
  if (urgents.length)
    alertes.push({
      ico: '⌨',
      txt: `${urgents.length} ouvrage${urgents.length > 1 ? 's' : ''} à programmer avec un départ dans moins de 14 jours`,
      onClick: () =>
        ouvrirAlerte(navigate, urgents, 'ouvrages', 'Ouvrages à programmer, départ sous 14 jours'),
    })
  if (tachesEnRetard.length)
    alertes.push({
      ico: '🔴',
      txt: `${tachesEnRetard.length} tâche${tachesEnRetard.length > 1 ? 's' : ''} en retard`,
      onClick: () => tasksRef.current?.scrollIntoView({ behavior: 'smooth' }),
    })
  if (tachesQuiTrainent.length)
    alertes.push({
      ico: '🕓',
      txt: `${tachesQuiTrainent.length} tâche${tachesQuiTrainent.length > 1 ? 's' : ''} sans mouvement depuis plus de ${ageLate} jours`,
      onClick: () => tasksRef.current?.scrollIntoView({ behavior: 'smooth' }),
    })

  const go = (o) => o.chantier?.id && navigate(`/chantiers/${o.chantier.id}/ouvrages`)

  return (
    <section className="page">
      <DashHeader />

      <Alertes items={alertes} />

      <div className="dash-grid">
        {/* Ouvrages à programmer */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">
              ⌨ Ouvrages à programmer <span className="card-count">{aProgrammer.length}</span>
            </span>
          </div>
          {aProgrammer.length === 0 ? (
            <div className="empty">Rien à programmer</div>
          ) : (
            aProgrammer.map((o) => <LigneOuvrage key={o.id} o={o} onClick={() => go(o)} />)
          )}
        </div>

        {/* À venir */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">
              🔜 À venir <span className="card-count">{aVenir.length}</span>
            </span>
          </div>
          <div className="param-hint" style={{ marginBottom: 6 }}>
            Ouvrages en attente ou en validation client, départ dans moins de 30 jours.
          </div>
          {aVenir.length === 0 ? (
            <div className="empty">Rien à venir sous 30 jours</div>
          ) : (
            aVenir.map((o) => <LigneOuvrage key={o.id} o={o} onClick={() => go(o)} />)
          )}
        </div>

        <MesTaches ref={tasksRef} employeId={employeId} />

        <MiniPlanning
          employes={employe ? [employe] : []}
          title="📅 Mon planning cette semaine"
        />
      </div>
    </section>
  )
}

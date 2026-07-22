import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../store/settings'
import { useMonEmploye } from '../../lib/useMonEmploye'
import { ouvrirAlerte, tacheEnRetard, taskAge } from '../../lib/dashboard'
import { STATUT_OUVRAGE } from '../../lib/statuts'
import Alertes from './Alertes'
import { SkelPage } from '../../components/Skeleton'
import DashHeader from './DashHeader'
import MesTaches from './MesTaches'
import FilActualite from './FilActualite'
import CoursesDuJour from './CoursesDuJour'
import DashboardIdees from '../DashboardIdees'

// Statuts qui relèvent du Bureau d'études.
const STATUTS_BE = ['a_faire_be', 'en_attente', 'validation_client']

export default function DashboardBe() {
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
      const [ouv, ach, fb] = await Promise.all([
        supabase
          .from('ouvrages')
          .select('id, nom, statut, dep, chantier:chantiers!chantier_id(id, num, client)')
          .in('statut', STATUTS_BE),
        supabase
          .from('achats')
          .select('id, nom, st, fournisseur:fournisseurs!fournisseur_id(nom), chantier:chantiers!chantier_id(id, num)')
          .eq('st', 'a_commander'),
        supabase
          .from('feedbacks')
          .select('id, statut, chantier_id')
          .neq('statut', 'resolu'),
      ])
      const err = [ouv, ach, fb].find((r) => r.error)
      if (!active) return
      if (err) {
        setError(err.error.message)
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
      setD({ ouvrages: ouv.data ?? [], achats: ach.data ?? [], feedbacks: fb.data ?? [], taches })
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

  const enAttenteValidation = d.ouvrages.filter((o) => o.statut === 'validation_client')
  const tachesEnRetard = d.taches.filter(tacheEnRetard)
  // Distinct du retard : ouvertes depuis longtemps, échéance ou non.
  const tachesQuiTrainent = d.taches.filter(
    (t) => !t.done && !tacheEnRetard(t) && taskAge(t, ageWarn, ageLate) === 'late'
  )

  const alertes = []
  if (enAttenteValidation.length)
    alertes.push({
      ico: '📐', tone: 'orange',
      txt: `${enAttenteValidation.length} ouvrage${enAttenteValidation.length > 1 ? 's' : ''} en attente de validation client`,
      onClick: () =>
        ouvrirAlerte(navigate, enAttenteValidation, 'ouvrages', 'Ouvrages en attente de validation client'),
    })
  if (d.feedbacks.length)
    alertes.push({
      ico: '🔧',
      txt: `${d.feedbacks.length} feedback${d.feedbacks.length > 1 ? 's' : ''} non résolu${d.feedbacks.length > 1 ? 's' : ''}`,
      onClick: () => ouvrirAlerte(navigate, d.feedbacks, 'feedbacks', 'Feedbacks non résolus'),
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

  // « Mes chantiers » : ceux qui ont au moins un ouvrage au bureau d'études.
  const parChantier = new Map()
  for (const o of d.ouvrages) {
    const c = o.chantier
    if (!c) continue
    if (!parChantier.has(c.id)) parChantier.set(c.id, { chantier: c, statuts: {} })
    const e = parChantier.get(c.id)
    e.statuts[o.statut] = (e.statuts[o.statut] ?? 0) + 1
  }
  const mesChantiers = [...parChantier.values()]
  const chantierIds = mesChantiers.map((m) => m.chantier.id)

  return (
    <section className="page">
      <DashHeader />

      <Alertes items={alertes} />

      <div className="dash-grid" style={{ marginBottom: 14 }}>
        <DashboardIdees />
      </div>

      <div className="dash-grid">
        {/* Mes chantiers */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">
              🏗 Mes chantiers <span className="card-count">{mesChantiers.length}</span>
            </span>
          </div>
          {mesChantiers.length === 0 ? (
            <div className="empty">Aucun ouvrage au bureau d'études</div>
          ) : (
            mesChantiers.map(({ chantier, statuts }) => (
              <div
                key={chantier.id}
                className="dash-line"
                onClick={() => navigate(`/chantiers/${chantier.id}/ouvrages`)}
              >
                <div className="dash-line-body">
                  <div className="dash-line-lbl">
                    <span className="mono">{chantier.num}</span> · {chantier.client}
                  </div>
                  <div className="dash-line-sub">
                    {STATUTS_BE.filter((s) => statuts[s]).map((s) => (
                      <span
                        key={s}
                        className="aspill"
                        style={{
                          color: STATUT_OUVRAGE[s].color,
                          backgroundColor: STATUT_OUVRAGE[s].color + '22',
                          marginRight: 4,
                        }}
                      >
                        {statuts[s]} {STATUT_OUVRAGE[s].label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Achats à traiter */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">
              📦 Achats à traiter <span className="card-count">{d.achats.length}</span>
            </span>
            <button
              className="btn bg bsm"
              onClick={() => navigate('/achats', { state: { quick: 'traiter' } })}
            >
              Voir tout →
            </button>
          </div>
          {d.achats.length === 0 ? (
            <div className="empty">Aucun achat à commander</div>
          ) : (
            d.achats.slice(0, 6).map((a) => (
              <div
                key={a.id}
                className="dash-line"
                onClick={() => navigate('/achats', { state: { quick: 'traiter' } })}
              >
                <div className="dash-line-body">
                  <div className="dash-line-lbl">{a.nom}</div>
                  <div className="dash-line-sub">
                    {a.fournisseur?.nom ?? 'Fournisseur —'}
                    {a.chantier?.num ? ' · ' : ''}
                    {a.chantier?.num && <span className="mono">{a.chantier.num}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <CoursesDuJour />
        <MesTaches ref={tasksRef} employeId={employeId} />
        <FilActualite chantierIds={chantierIds} />
      </div>
    </section>
  )
}

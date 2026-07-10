import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store'
import { useSettings } from '../../store/settings'
import { useMonEmploye } from '../../lib/useMonEmploye'
import { CLOS, daysUntil, eur, taskAge } from '../../lib/dashboard'
import { formatDate } from '../../lib/format'
import Alertes from './Alertes'
import MesTaches from './MesTaches'
import FilActualite from './FilActualite'

// Statut d'un chantier déduit de ses ouvrages.
function statutChantier(statuts) {
  if (statuts.length === 0) return { label: 'Sans ouvrage', color: '#a59a94' }
  if (statuts.every((s) => CLOS.includes(s))) return { label: 'Terminé', color: '#5a7a5a' }
  if (statuts.some((s) => s === 'termine')) return { label: 'À facturer', color: '#8a7040' }
  return { label: 'En cours', color: '#4a6b8a' }
}

function Bar({ pct, depasse }) {
  return (
    <div className="ana-bar">
      <div
        className="ana-fill"
        style={{ width: Math.min(100, pct) + '%', background: depasse ? 'var(--rd)' : 'var(--gn)' }}
      />
    </div>
  )
}

export default function DashboardCa() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { employeId } = useMonEmploye()
  const ageWarn = useSettings((s) => s.alerte_orange)
  const ageLate = useSettings((s) => s.alerte_rouge)
  const tasksRef = useRef(null)

  const [d, setD] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!user?.id) return
    async function load() {
      // Le CA ne voit que les chantiers dont il est le chargé d'affaire.
      const ch = await supabase
        .from('chantiers')
        .select(
          'id, num, client, dep_approx, heures_vendues, heures_realisees, fournitures_vendues'
        )
        .eq('ca_id', user.id)
        .order('num')
      if (!active) return
      if (ch.error) {
        setError(ch.error.message)
        return
      }
      const ids = (ch.data ?? []).map((c) => c.id)
      if (ids.length === 0) {
        setD({ chantiers: [], ouvrages: [], achats: [], taches: [] })
        return
      }
      const [ouv, ach] = await Promise.all([
        supabase.from('ouvrages').select('id, statut, dep, chantier_id').in('chantier_id', ids),
        supabase.from('achats').select('id, mht, chantier_id').in('chantier_id', ids),
      ])
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
        chantiers: ch.data ?? [],
        ouvrages: ouv.data ?? [],
        achats: ach.data ?? [],
        taches,
      })
    }
    load()
    return () => {
      active = false
    }
  }, [user?.id, employeId])

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

  const statutsParChantier = {}
  for (const o of d.ouvrages) (statutsParChantier[o.chantier_id] ??= []).push(o.statut)

  const achatsParChantier = {}
  for (const a of d.achats)
    achatsParChantier[a.chantier_id] = (achatsParChantier[a.chantier_id] ?? 0) + (Number(a.mht) || 0)

  const depUrgents = d.ouvrages.filter(
    (o) => o.dep && daysUntil(o.dep) <= 7 && !CLOS.includes(o.statut)
  )
  const tachesEnRetard = d.taches.filter(
    (t) => !t.done && taskAge(t, ageWarn, ageLate) === 'late'
  )

  const alertes = []
  if (depUrgents.length)
    alertes.push({
      ico: '🚨',
      txt: `${depUrgents.length} départ${depUrgents.length > 1 ? 's' : ''} atelier dans moins de 7 jours sur vos chantiers`,
      onClick: () => navigate('/chantiers'),
    })
  if (tachesEnRetard.length)
    alertes.push({
      ico: '🔴',
      txt: `${tachesEnRetard.length} tâche${tachesEnRetard.length > 1 ? 's' : ''} en retard`,
      onClick: () => tasksRef.current?.scrollIntoView({ behavior: 'smooth' }),
    })

  const chantierIds = d.chantiers.map((c) => c.id)

  return (
    <section className="page">
      <h2 className="dash-title">Chargé d'affaire — Tableau de bord</h2>

      <Alertes items={alertes} />

      <div className="dash-grid">
        {/* Mes chantiers */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">
              🏗 Mes chantiers <span className="card-count">{d.chantiers.length}</span>
            </span>
          </div>
          {d.chantiers.length === 0 ? (
            <div className="empty">Aucun chantier ne vous est affecté</div>
          ) : (
            d.chantiers.map((c) => {
              const st = statutChantier(statutsParChantier[c.id] ?? [])
              return (
                <div
                  key={c.id}
                  className="dash-line"
                  onClick={() => navigate(`/chantiers/${c.id}/ouvrages`)}
                >
                  <div className="dash-line-body">
                    <div className="dash-line-lbl">
                      <span className="mono">{c.num}</span> · {c.client}
                    </div>
                    <div className="dash-line-sub">
                      {c.dep_approx ? `📅 Départ atelier : ${formatDate(c.dep_approx)}` : 'Départ non planifié'}
                    </div>
                  </div>
                  <span
                    className="aspill"
                    style={{ color: st.color, backgroundColor: st.color + '22' }}
                  >
                    {st.label}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Analytique rapide */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">📊 Analytique rapide</span>
          </div>
          {d.chantiers.length === 0 ? (
            <div className="empty">Aucun chantier</div>
          ) : (
            d.chantiers.map((c) => {
              const hv = Number(c.heures_vendues) || 0
              const hr = Number(c.heures_realisees) || 0
              const fv = Number(c.fournitures_vendues) || 0
              const fa = achatsParChantier[c.id] ?? 0
              const pH = hv > 0 ? Math.round((hr / hv) * 100) : 0
              const pF = fv > 0 ? Math.round((fa / fv) * 100) : 0
              return (
                <div key={c.id} className="ca-ana">
                  <div className="ca-ana-num mono">{c.num}</div>
                  <div className="ca-ana-row">
                    <span>⏱ Heures</span>
                    <span className="dash-line-val">
                      {hr}h / {hv}h
                    </span>
                  </div>
                  <Bar pct={pH} depasse={hr > hv} />
                  <div className="ca-ana-row">
                    <span>🪵 Fournitures</span>
                    <span className="dash-line-val">
                      {eur(fa)} / {eur(fv)}
                    </span>
                  </div>
                  <Bar pct={pF} depasse={fa > fv} />
                </div>
              )
            })
          )}
        </div>

        <MesTaches ref={tasksRef} employeId={employeId} />
        <FilActualite chantierIds={chantierIds} />
      </div>
    </section>
  )
}

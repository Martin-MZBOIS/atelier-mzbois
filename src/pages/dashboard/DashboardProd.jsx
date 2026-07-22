import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../store/settings'
import { useMonEmploye } from '../../lib/useMonEmploye'
import { amenerAlEcran, isoDay, ouvrirAlerte, tacheEnRetard, taskAge } from '../../lib/dashboard'
import { STATUT_FEEDBACK, resolve } from '../../lib/statuts'
import Alertes from './Alertes'
import { SkelPage } from '../../components/Skeleton'
import DashHeader from './DashHeader'
import MesTaches from './MesTaches'
import MiniPlanning from './MiniPlanning'
import CoursesDuJour from './CoursesDuJour'
import DashboardIdees from '../DashboardIdees'

// Fiches employé créées pour les utilisateurs de l'app (migration 0026) mais
// qui ne font pas partie de l'équipe atelier : hors planning de production.
const HORS_ATELIER = ['Dirigeant', 'Admin', "Chargé d'affaire"]

export default function DashboardProd() {
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
      const today = isoDay()
      const sel =
        'id, nom, st, date_reception, ' +
        'fournisseur:fournisseurs!fournisseur_id(nom), ' +
        'chantier:chantiers!chantier_id(id, num)'
      // date_reception vient de la migration 0007 : repli si absente.
      let rec = await supabase.from('achats').select(sel).eq('date_reception', today)
      if (rec.error && /date_reception/.test(rec.error.message)) rec = { data: [] }

      const [enLiv, fb, em] = await Promise.all([
        supabase.from('achats').select('id, nom, st').eq('st', 'en_cours_livraison'),
        supabase
          .from('feedbacks')
          .select('id, description, statut, date, chantier:chantiers!chantier_id(id, num)')
          .neq('statut', 'resolu'),
        supabase.from('employes').select('id, prenom, nom, role').order('nom'),
      ])
      const err = [enLiv, fb, em].find((r) => r.error)
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
      setD({
        receptions: rec.data ?? [],
        enLivraison: enLiv.data ?? [],
        feedbacks: fb.data ?? [],
        employes: (em.data ?? []).filter((e) => !HORS_ATELIER.includes(e.role)),
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
        <SkelPage cards={2} rows={3} />
      </section>
    )

  const tachesEnRetard = d.taches.filter(tacheEnRetard)
  // Distinct du retard : ouvertes depuis longtemps, échéance ou non.
  const tachesQuiTrainent = d.taches.filter(
    (t) => !t.done && !tacheEnRetard(t) && taskAge(t, ageWarn, ageLate) === 'late'
  )

  const alertes = []
  if (d.enLivraison.length)
    alertes.push({
      ico: '🚛', tone: 'orange',
      txt: `${d.enLivraison.length} achat${d.enLivraison.length > 1 ? 's' : ''} en cours de livraison`,
      onClick: () => navigate('/achats', { state: { quick: 'liv' } }),
    })
  if (d.feedbacks.length)
    alertes.push({
      ico: '🔧',
      txt: `${d.feedbacks.length} feedback${d.feedbacks.length > 1 ? 's' : ''} non traité${d.feedbacks.length > 1 ? 's' : ''}`,
      onClick: () => ouvrirAlerte(navigate, d.feedbacks, 'feedbacks', 'Feedbacks non traités'),
    })
  if (tachesEnRetard.length)
    alertes.push({
      ico: '🔴',
      txt: `${tachesEnRetard.length} tâche${tachesEnRetard.length > 1 ? 's' : ''} en retard`,
      onClick: () => amenerAlEcran(tasksRef.current),
    })
  if (tachesQuiTrainent.length)
    alertes.push({
      ico: '🕓',
      txt: `${tachesQuiTrainent.length} tâche${tachesQuiTrainent.length > 1 ? 's' : ''} sans mouvement depuis plus de ${ageLate} jours`,
      onClick: () => amenerAlEcran(tasksRef.current),
    })

  return (
    <section className="page">
      <DashHeader />

      <Alertes items={alertes} />

      <div className="dash-grid" style={{ marginBottom: 14 }}>
        <DashboardIdees />
      </div>

      <div className="dash-grid">
        {/* Réceptions du jour */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">
              📦 Réceptions du jour <span className="card-count">{d.receptions.length}</span>
            </span>
            <button className="btn bg bsm" onClick={() => navigate('/achats')}>
              Voir tout →
            </button>
          </div>
          {d.receptions.length === 0 ? (
            <div className="empty">Aucune réception attendue aujourd'hui</div>
          ) : (
            d.receptions.map((a) => (
              <div key={a.id} className="dash-line" onClick={() => navigate('/achats')}>
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

        {/* Feedbacks en cours */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">
              🔧 Feedbacks en cours <span className="card-count">{d.feedbacks.length}</span>
            </span>
          </div>
          {d.feedbacks.length === 0 ? (
            <div className="empty">Aucun feedback en cours</div>
          ) : (
            d.feedbacks.map((f) => {
              const st = resolve(STATUT_FEEDBACK, f.statut)
              return (
                <div
                  key={f.id}
                  className="dash-line"
                  onClick={() =>
                    f.chantier?.id && navigate(`/chantiers/${f.chantier.id}/feedbacks`)
                  }
                >
                  <div className="dash-line-body">
                    <div className="dash-line-lbl">{f.description}</div>
                    <div className="dash-line-sub">
                      <span className="mono">{f.chantier?.num}</span>
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

        <CoursesDuJour />
        <MesTaches ref={tasksRef} employeId={employeId} />

        <MiniPlanning employes={d.employes} title="📅 Planning atelier cette semaine" />
      </div>
    </section>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import SelectSearch from '../components/SelectSearch'
import EmptyState from '../components/EmptyState'
import { SkelList } from '../components/Skeleton'
import { supabase } from '../lib/supabase'
import { toast } from '../store/toasts'
import { formatDate } from '../lib/format'
import { STATUT_FEEDBACK, STATUT_FEEDBACK_ORDER, resolve } from '../lib/statuts'

// Poste de triage des feedbacks, toutes fiches chantier confondues.
//
// Un feedback ne vivait que dans son chantier : pour savoir ce qui traînait, il
// aurait fallu ouvrir les 40 chantiers un par un. Cette page rassemble tout et
// permet d'assigner un responsable sans quitter la liste — le Resp. Prod route,
// chacun voit ce qui lui revient.

const VUES = [
  { id: 'atraiter', label: 'À traiter' },
  { id: 'encours', label: 'En cours' },
  { id: 'resolus', label: 'Résolus' },
  { id: 'toutes', label: 'Tous' },
]

const PERIODES = [
  { id: 'tout', label: 'Tout' },
  { id: '30', label: '30 jours' },
  { id: '90', label: '3 mois' },
  { id: '365', label: '12 mois' },
]

export default function Feedbacks() {
  const [feedbacks, setFeedbacks] = useState(null)
  const [employes, setEmployes] = useState([])
  const [chantiers, setChantiers] = useState([])
  const [erreur, setErreur] = useState('')
  const [sansAssignation, setSansAssignation] = useState(false)

  const [vue, setVue] = useState('atraiter')
  const [qui, setQui] = useState('tous')
  const [chantier, setChantier] = useState('tous')
  const [periode, setPeriode] = useState('tout')
  const [recherche, setRecherche] = useState('')

  const charger = useCallback(async () => {
    const base =
      'id, description, statut, date, solution, date_solution, chantier_id, ' +
      'chantier:chantiers!chantier_id(id, num), ' +
      'ouvrage:ouvrages!ouvrage_id(nom), ' +
      'auteur:utilisateurs!saisi_par(prenom, nom)'
    const avecAssigne = base + ', assigne_a, employe:employes!assigne_a(prenom, nom)'

    const req = (champs) =>
      supabase.from('feedbacks').select(champs).order('date', { ascending: false })

    // Repli si la migration 0034 n'est pas encore passée.
    let { data, error } = await req(avecAssigne)
    if (error && /assigne_a|employes/i.test(error.message)) {
      setSansAssignation(true)
      ;({ data, error } = await req(base))
    }
    if (error) {
      setErreur(error.message)
      setFeedbacks([])
      return
    }
    setFeedbacks(data ?? [])
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  useEffect(() => {
    let actif = true
    Promise.all([
      supabase.from('employes').select('id, prenom, nom').order('nom'),
      supabase.from('chantiers').select('id, num').order('num'),
    ]).then(([em, ch]) => {
      if (!actif) return
      setEmployes(em.data ?? [])
      setChantiers(ch.data ?? [])
    })
    return () => {
      actif = false
    }
  }, [])

  // Changer le statut. Passer à « résolu » date la résolution ; en sortir
  // l'efface, pour que la date reflète toujours la réalité.
  async function changeStatut(fb, statut) {
    const patch = {
      statut,
      date_solution: statut === 'resolu' ? new Date().toISOString().slice(0, 10) : null,
    }
    setFeedbacks((prev) => prev.map((f) => (f.id === fb.id ? { ...f, ...patch } : f)))
    const { error } = await supabase.from('feedbacks').update(patch).eq('id', fb.id)
    if (error) {
      setErreur(error.message)
      toast.error('Statut non enregistré')
      await charger()
    } else {
      toast('Feedback — ' + resolve(STATUT_FEEDBACK, statut).label)
    }
  }

  // Assigner. Désigner quelqu'un sur un feedback encore « remonté » le fait
  // passer en cours : c'est le moment où il trouve un propriétaire.
  async function changeAssigne(fb, employeId) {
    const patch = { assigne_a: employeId || null }
    if (employeId && fb.statut === 'remonte') patch.statut = 'en_cours'
    setFeedbacks((prev) => prev.map((f) => (f.id === fb.id ? { ...f, ...patch } : f)))
    const { error } = await supabase.from('feedbacks').update(patch).eq('id', fb.id)
    if (error) {
      setErreur(error.message)
      toast.error('Assignation non enregistrée')
      await charger()
    } else {
      const dest = employes.find((e) => e.id === employeId)
      toast(dest ? `Assigné à ${dest.prenom}` : 'Assignation retirée')
    }
  }

  const filtres = useMemo(() => {
    if (!feedbacks) return []
    const q = recherche.trim().toLowerCase()
    const limite = periode === 'tout' ? null : Date.now() - Number(periode) * 86400000
    return feedbacks.filter((f) => {
      if (vue === 'atraiter' && f.statut !== 'remonte') return false
      if (vue === 'encours' && f.statut !== 'en_cours') return false
      if (vue === 'resolus' && f.statut !== 'resolu') return false
      if (qui === 'aucun' && f.assigne_a) return false
      if (qui !== 'tous' && qui !== 'aucun' && f.assigne_a !== qui) return false
      if (chantier !== 'tous' && f.chantier_id !== chantier) return false
      if (limite && new Date(f.date).getTime() < limite) return false
      if (q && !(f.description ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [feedbacks, vue, qui, chantier, periode, recherche])

  return (
    <section className="page">
      <div className="page-head">
        <h2>Feedbacks</h2>
        <span className="page-count">
          {feedbacks ? `${filtres.length} / ${feedbacks.length}` : ''}
        </span>
      </div>

      {sansAssignation && (
        <div className="alert">
          <strong>Assignation indisponible :</strong> exécute la migration{' '}
          <code>supabase/migrations/0034_feedback_assignation.sql</code>. Le reste
          de la page fonctionne.
        </div>
      )}
      {erreur && (
        <div className="alert">
          <strong>Erreur :</strong> {erreur}
        </div>
      )}

      <div className="hist-filtres">
        <input
          className="plan-search"
          style={{ width: 240, marginBottom: 0 }}
          placeholder="🔍 Rechercher un feedback…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />

        <div className="view-toggle">
          {VUES.map((v) => (
            <button
              key={v.id}
              className={'vt' + (vue === v.id ? ' vt--on' : '')}
              onClick={() => setVue(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <SelectSearch
          className="hist-sel"
          value={qui}
          onChange={setQui}
          options={[
            { value: 'tous', label: 'Tout le monde' },
            { value: 'aucun', label: '— Non assignés —' },
          ].concat(employes.map((e) => ({ value: e.id, label: e.prenom + ' ' + e.nom })))}
        />

        <SelectSearch
          className="hist-sel"
          value={chantier}
          onChange={setChantier}
          options={[{ value: 'tous', label: 'Tous les chantiers' }].concat(
            chantiers.map((c) => ({ value: c.id, label: c.num }))
          )}
        />

        <SelectSearch
          className="hist-sel"
          value={periode}
          onChange={setPeriode}
          options={PERIODES.map((p) => ({ value: p.id, label: p.label }))}
        />
      </div>

      <div className="card">
        {!feedbacks ? (
          <SkelList rows={6} />
        ) : filtres.length === 0 ? (
          <EmptyState
            ico="🔧"
            titre="Aucun feedback pour ces critères"
            aide="Changez de filtre, ou élargissez la période."
          />
        ) : (
          filtres.map((f) => {
            const st = resolve(STATUT_FEEDBACK, f.statut)
            return (
              <div key={f.id} className="fb-row">
                <div className="fb-main">
                  <div className="fb-desc">{f.description}</div>
                  <div className="fb-meta">
                    {f.chantier?.num && <span className="mono">{f.chantier.num}</span>}
                    {f.ouvrage?.nom && <span>📐 {f.ouvrage.nom}</span>}
                    {f.auteur && (
                      <span>
                        Remonté par {f.auteur.prenom} {f.auteur.nom}
                      </span>
                    )}
                    <span>{formatDate(f.date)}</span>
                    {f.statut === 'resolu' && f.date_solution && (
                      <span className="fb-ok">Résolu le {formatDate(f.date_solution)}</span>
                    )}
                  </div>
                  {f.solution && <div className="fb-solution">💡 {f.solution}</div>}
                </div>

                <div className="fb-actions">
                  <SelectSearch
                    className="ss"
                    value={f.assigne_a ?? ''}
                    onChange={(v) => changeAssigne(f, v)}
                    disabled={sansAssignation}
                    allowEmpty
                    emptyLabel="— À assigner —"
                    options={employes.map((e) => ({
                      value: e.id,
                      label: e.prenom + ' ' + e.nom,
                    }))}
                  />
                  <SelectSearch
                    className="ss"
                    value={f.statut ?? ''}
                    onChange={(v) => changeStatut(f, v)}
                    allowEmpty={f.statut == null}
                    options={STATUT_FEEDBACK_ORDER.map((slug) => ({
                      value: slug,
                      label: STATUT_FEEDBACK[slug].label,
                    }))}
                  />
                  <span
                    className="aspill"
                    style={{ color: st.color, backgroundColor: st.color + '22' }}
                  >
                    {st.label}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

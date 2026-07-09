import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store'
import { useSettings } from '../store/settings'
import { ROLES } from '../lib/roles'
import { formatDateTime } from '../lib/format'
import { nextHommesCles, nextStrategie } from '../lib/copil'
import {
  STATUT_OUVRAGE,
  STATUT_OUVRAGE_ORDER,
  resolve,
} from '../lib/statuts'
import TaskModal from './TaskModal'
import TaskEditModal from './TaskEditModal'

const CHANTIER_COLORS = [
  '#FEE2E2', '#DBEAFE', '#D1FAE5', '#EDE9FE', '#FEF3C7', '#FCE7F3', '#E0F2FE',
]
const JOURS5 = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
const ACTIF_STATUTS = STATUT_OUVRAGE_ORDER.filter(
  (s) => !['termine', 'facture'].includes(s)
)

function isoDay(d) {
  return (
    d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
  )
}
function daysUntil(dateStr) {
  if (!dateStr) return 999
  return Math.floor((new Date(dateStr) - new Date()) / 86400000)
}
function daysSince(dateStr) {
  if (!dateStr) return 0
  return Math.floor((new Date() - new Date(dateStr)) / 86400000)
}
// Jours avant la prochaine occurrence (jour/mois) de la date ; 0 = aujourd'hui.
function daysUntilAnniv(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let next = new Date(now.getFullYear(), d.getMonth(), d.getDate())
  if (next < today) next = new Date(now.getFullYear() + 1, d.getMonth(), d.getDate())
  return Math.round((next - today) / 86400000)
}
function taskAge(t, warn, late) {
  const d = daysSince(t.created_at)
  if (d >= late) return 'late'
  if (d >= warn) return 'warn'
  return 'ok'
}

// ---- Météo (open-meteo) ----
function wIcon(c) {
  if (c === 0) return '☀️'
  if (c <= 3) return '⛅'
  if (c <= 48) return '🌫️'
  if (c <= 67) return '🌧️'
  if (c <= 77) return '❄️'
  if (c <= 82) return '🌦️'
  return '⛈️'
}
function wLabel(c) {
  if (c === 0) return 'Ensoleillé'
  if (c <= 3) return 'Nuageux'
  if (c <= 48) return 'Brouillard'
  if (c <= 67) return 'Pluvieux'
  if (c <= 77) return 'Neige'
  if (c <= 82) return 'Averses'
  return 'Orageux'
}

const FIL_TYPES = [
  { id: 'tous', label: 'Tous' },
  { id: 'msg', label: '💬 Messages' },
  { id: 'ach', label: '📦 Achats' },
  { id: 'fb', label: '⚠️ Feedbacks' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const role = user ? ROLES[user.role] : null
  const ageWarn = useSettings((s) => s.alerte_orange)
  const ageLate = useSettings((s) => s.alerte_rouge)
  const tasksRef = useRef(null)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [meteo, setMeteo] = useState(null)
  const [filFilt, setFilFilt] = useState('tous')
  const [filShowAll, setFilShowAll] = useState(false)
  const [ovFilt, setOvFilt] = useState('tous')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [taskView, setTaskView] = useState('pending') // 'pending' | 'done'

  async function loadAll() {
    // Employés : tente avec date_naissance (0016), repli sans si absente.
    let emp = await supabase.from('employes').select('id, prenom, nom, role, date_entree, date_naissance').order('nom')
    if (emp.error && /date_naissance/.test(emp.error.message)) {
      emp = await supabase.from('employes').select('id, prenom, nom, role, date_entree').order('nom')
    }
    // Messages d'assistance non lus (0017) — best-effort, ignoré si absent.
    let assist = await supabase
      .from('assistance_messages')
      .select('id, type, texte, categorie, lu, cree_le')
      .eq('lu', false)
      .order('cree_le', { ascending: false })
    if (assist.error) assist = { data: [] }

    const [ouv, ach, tach, fil, fb, plan, ch] = await Promise.all([
      supabase.from('ouvrages').select('id, nom, statut, dep, chantier:chantiers!chantier_id(id, num)'),
      supabase.from('achats').select('id, nom, st, mht, chantier:chantiers!chantier_id(id, num)'),
      supabase.from('taches').select('id, texte, done, created_at, source, echeance, chantier:chantiers!chantier_id(id, num), employe:employes!assigne_a(id, prenom)').order('created_at', { ascending: true }),
      supabase.from('fil_messages').select('id, texte, date, chantier:chantiers!chantier_id(id, num), auteur:utilisateurs!auteur_id(prenom, nom)'),
      supabase.from('feedbacks').select('id, description, statut, date, chantier:chantiers!chantier_id(id, num)'),
      supabase.from('plan_affectations').select('sal_id, chantier_id, date_debut, date_fin, chantier:chantiers!chantier_id(num)'),
      supabase.from('chantiers').select('id, num').order('num'),
    ])
    const firstErr = [ouv, ach, tach, fil, fb, plan, emp, ch].find((r) => r.error)
    if (firstErr) {
      setError(firstErr.error.message)
      return null
    }
    return {
      ouvrages: ouv.data ?? [],
      achats: ach.data ?? [],
      taches: tach.data ?? [],
      messages: fil.data ?? [],
      feedbacks: fb.data ?? [],
      affectations: plan.data ?? [],
      employes: emp.data ?? [],
      chantiers: ch.data ?? [],
      assistance: assist.data ?? [],
    }
  }

  async function reload() {
    const d = await loadAll()
    if (d) setData(d)
  }

  useEffect(() => {
    let active = true
    async function init() {
      setLoading(true)
      setError('')
      const d = await loadAll()
      if (!active) return
      if (d) setData(d)
      setLoading(false)
    }
    init()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let active = true
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=45.89&longitude=4.39&current=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe/Paris&forecast_days=3'
    )
      .then((r) => r.json())
      .then((d) => active && setMeteo(d))
      .catch(() => active && setMeteo({ err: true }))
    return () => {
      active = false
    }
  }, [])

  const chantierColor = useMemo(() => {
    const m = {}
    ;(data?.chantiers ?? []).forEach((c, i) => {
      m[c.id] = CHANTIER_COLORS[i % CHANTIER_COLORS.length]
    })
    return m
  }, [data])

  function goToChantier(cid) {
    if (cid) navigate(`/chantiers/${cid}/ouvrages`)
  }

  // ---- Dérivés ----
  const urgDep = useMemo(
    () =>
      (data?.ouvrages ?? []).filter(
        (o) =>
          o.dep &&
          daysUntil(o.dep) <= 7 &&
          !['termine', 'facture'].includes(o.statut)
      ),
    [data]
  )
  const urgAch = useMemo(
    () => (data?.achats ?? []).filter((a) => a.st === 'a_commander'),
    [data]
  )
  // Achats sans montant (dir) — à compléter avant de lire l'analytique.
  const achatsSansMontant = useMemo(
    () =>
      user?.role === 'dir'
        ? (data?.achats ?? []).filter(
            (a) => a.mht == null || Number(a.mht) === 0
          )
        : [],
    [data, user]
  )
  const pendingTasks = useMemo(
    () => (data?.taches ?? []).filter((t) => !t.done),
    [data]
  )
  const doneTasks = useMemo(
    () => (data?.taches ?? []).filter((t) => t.done),
    [data]
  )
  const displayedTasks = taskView === 'done' ? doneTasks : pendingTasks
  const lateTasks = useMemo(
    () =>
      user?.role === 'dir'
        ? pendingTasks.filter((t) => taskAge(t, ageWarn, ageLate) === 'late')
        : [],
    [pendingTasks, user, ageWarn, ageLate]
  )

  const actus = useMemo(() => {
    if (!data) return []
    const acts = []
    for (const m of data.messages) {
      acts.push({
        type: 'msg', icon: '💬',
        lbl: `${m.auteur ? m.auteur.prenom + ' ' + m.auteur.nom : '?'} sur ${m.chantier?.num ?? ''}`,
        det: (m.texte ?? '').slice(0, 60),
        cid: m.chantier?.id, date: m.date,
      })
    }
    for (const f of data.feedbacks.filter((f) => f.statut !== 'resolu')) {
      acts.push({
        type: 'fb', icon: '⚠️',
        lbl: `Feedback — ${f.chantier?.num ?? ''}`,
        det: (f.description ?? '').slice(0, 60),
        cid: f.chantier?.id, date: f.date,
      })
    }
    for (const a of data.achats.filter((a) => a.st === 'recu')) {
      acts.push({
        type: 'ach', icon: '📦',
        lbl: `Reçu — ${a.chantier?.num ?? ''}`,
        det: a.nom, cid: a.chantier?.id, date: null,
      })
    }
    return acts.sort((a, b) => (b.date ?? '') > (a.date ?? '') ? 1 : -1)
  }, [data])

  const filtActus = actus.filter((a) => filFilt === 'tous' || a.type === filFilt)
  const visActus = filShowAll ? filtActus : filtActus.slice(0, 5)

  const activeOuvrages = useMemo(
    () =>
      (data?.ouvrages ?? []).filter(
        (o) => !['termine', 'facture'].includes(o.statut)
      ),
    [data]
  )
  const filtOuvrages =
    ovFilt === 'tous'
      ? activeOuvrages
      : activeOuvrages.filter((o) => o.statut === ovFilt)

  // Mini planning : menuisiers (max 4), lundi->vendredi de la semaine courante
  const week5 = useMemo(() => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }, [])
  const menuisiers = (data?.employes ?? [])
    .filter((e) => (e.role ?? '').toLowerCase().includes('menuisier'))
    .slice(0, 4)

  async function toggleTask(t) {
    const { error: e } = await supabase
      .from('taches')
      .update({ done: !t.done })
      .eq('id', t.id)
    if (!e) reload()
  }
  async function deleteTask(id) {
    const { error: e } = await supabase.from('taches').delete().eq('id', id)
    if (!e) reload()
  }

  if (loading) return <section className="page"><p className="muted">Chargement…</p></section>
  if (error)
    return (
      <section className="page">
        <div className="alert"><strong>Erreur :</strong> {error}</div>
      </section>
    )

  const alerts = []
  if (urgDep.length)
    alerts.push({ ico: '🚨', txt: `${urgDep.length} départ${urgDep.length > 1 ? 's' : ''} atelier dans moins de 7 jours`, onClick: () => navigate('/chantiers') })
  if (urgAch.length)
    alerts.push({ ico: '⚠️', txt: `${urgAch.length} achat${urgAch.length > 1 ? 's' : ''} à commander`, onClick: () => navigate('/achats', { state: { quick: 'traiter' } }) })
  if (lateTasks.length)
    alerts.push({ ico: '🔴', txt: `${lateTasks.length} tâche${lateTasks.length > 1 ? 's' : ''} en retard`, onClick: () => tasksRef.current?.scrollIntoView({ behavior: 'smooth' }) })
  if (achatsSansMontant.length)
    alerts.push({ ico: '💶', txt: `${achatsSansMontant.length} achat${achatsSansMontant.length > 1 ? 's' : ''} sans montant à compléter (avant l'analytique)`, onClick: () => navigate('/achats') })
  if (user?.role === 'dir') {
    const nbAssist = (data?.assistance ?? []).length
    if (nbAssist)
      alerts.push({ ico: '💬', txt: `${nbAssist} message${nbAssist > 1 ? 's' : ''} d'assistance (question/suggestion) à consulter`, onClick: () => navigate('/assistance') })
    const dHc = daysUntil(nextHommesCles())
    if (dHc >= 0 && dHc <= 7)
      alerts.push({ ico: '⚠️', txt: `Réunion Hommes clés dans ${dHc} jour${dHc > 1 ? 's' : ''} — préparez l'ordre du jour`, onClick: () => navigate('/copil') })
    const dStr = daysUntil(nextStrategie())
    if (dStr >= 0 && dStr <= 14)
      alerts.push({ ico: '📊', txt: `Réunion Stratégie dans ${dStr} jour${dStr > 1 ? 's' : ''} — préparez l'ordre du jour`, onClick: () => navigate('/copil') })

    // Anniversaires salariés (perso J-7 ; entreprise jour J).
    for (const e of data?.employes ?? []) {
      const dNaiss = daysUntilAnniv(e.date_naissance)
      if (dNaiss != null && dNaiss >= 0 && dNaiss <= 7)
        alerts.push({
          ico: '🎂',
          txt:
            dNaiss === 0
              ? `Anniversaire de ${e.prenom} aujourd'hui !`
              : `Anniversaire de ${e.prenom} dans ${dNaiss} jour${dNaiss > 1 ? 's' : ''}`,
          onClick: () => navigate('/contacts'),
        })
      const dEnt = daysUntilAnniv(e.date_entree)
      if (dEnt === 0 && e.date_entree) {
        const ans = new Date().getFullYear() - new Date(e.date_entree).getFullYear()
        if (ans > 0)
          alerts.push({
            ico: '🎉',
            txt: `${e.prenom} fête ses ${ans} an${ans > 1 ? 's' : ''} chez MZ Bois !`,
            onClick: () => navigate('/contacts'),
          })
      }
    }
  }

  return (
    <section className="page">
      <h2 className="dash-title">
        {role?.label ?? 'Utilisateur'} — Tableau de bord
      </h2>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="dash-alerts">
          {alerts.map((a, i) => (
            <div key={i} className="dash-alert" onClick={a.onClick}>
              {a.ico} <span>{a.txt}</span>
              <span className="dash-alert-arrow">→</span>
            </div>
          ))}
        </div>
      )}

      {/* Météo */}
      <div className="meteo-card">
        {!meteo ? (
          <div className="meteo-loading">Chargement météo…</div>
        ) : meteo.err ? (
          <div className="meteo-loading">Météo indisponible</div>
        ) : (
          <div className="meteo-inner">
            <div>
              <div className="meteo-loc">📍 Tarare / Lyon</div>
              <div className="meteo-temp">
                {Math.round(meteo.current.temperature_2m)}°C
              </div>
              <div className="meteo-desc">
                {wIcon(meteo.current.weathercode)} {wLabel(meteo.current.weathercode)}
              </div>
            </div>
            <div className="meteo-days">
              {['Auj.', 'Dem.', 'J+2'].map((lbl, i) => (
                <div key={i} className="meteo-day">
                  <div className="meteo-day-lbl">{lbl}</div>
                  <div className="meteo-day-ico">{wIcon(meteo.daily.weathercode[i])}</div>
                  <div className="meteo-day-max">{Math.round(meteo.daily.temperature_2m_max[i])}°</div>
                  <div className="meteo-day-min">{Math.round(meteo.daily.temperature_2m_min[i])}°</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="dash-grid">
        {/* Mes tâches */}
        <div className="card" ref={tasksRef}>
          <div className="card-head">
            <span className="card-title">Mes tâches</span>
            <div className="card-actions">
              <div className="view-toggle">
                <button
                  className={'vt' + (taskView === 'pending' ? ' vt--on' : '')}
                  onClick={() => setTaskView('pending')}
                >
                  En attente ({pendingTasks.length})
                </button>
                <button
                  className={'vt' + (taskView === 'done' ? ' vt--on' : '')}
                  onClick={() => setTaskView('done')}
                >
                  Terminées ({doneTasks.length})
                </button>
              </div>
              <button className="btn bp bsm" onClick={() => setShowTaskModal(true)}>
                + Tâche
              </button>
            </div>
          </div>
          {displayedTasks.length === 0 ? (
            <div className="empty">
              {taskView === 'done' ? 'Aucune tâche terminée' : '✓ Aucune tâche en attente'}
            </div>
          ) : (
            displayedTasks.map((t) => {
              const age = taskAge(t, ageWarn, ageLate)
              const d = daysSince(t.created_at)
              return (
                <div
                  key={t.id}
                  className={'task-item task-item--' + (t.done ? 'done' : age)}
                >
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleTask(t)}
                  />
                  <div
                    className="task-body task-body--click"
                    onClick={() => setEditingTask(t)}
                  >
                    <div className={'task-text' + (t.done ? ' task-text--done' : '')}>
                      {t.texte}
                    </div>
                    <div className="task-meta">
                      {t.chantier && <span className="task-num mono">{t.chantier.num}</span>}
                      {t.source === 'reunion' && <span className="task-tag">📋 Réunion de chantiers</span>}
                      {t.employe && <span className="task-assignee">👤 {t.employe.prenom}</span>}
                      {!t.done && d > 0 && <span className={'task-age task-age--' + age}>{d}j</span>}
                    </div>
                  </div>
                  <button className="task-del" onClick={() => deleteTask(t.id)}>✕</button>
                </div>
              )
            })
          )}
        </div>

        {/* Fil d'actualité */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">Fil d'actualité</span>
          </div>
          <div className="fil-type-row">
            {FIL_TYPES.map((ft) => (
              <button
                key={ft.id}
                className={'qf' + (filFilt === ft.id ? ' qf--on' : '')}
                onClick={() => {
                  setFilFilt(ft.id)
                  setFilShowAll(false)
                }}
              >
                {ft.label}
              </button>
            ))}
          </div>
          {visActus.length === 0 ? (
            <div className="empty">Aucune activité</div>
          ) : (
            visActus.map((a, i) => (
              <div key={i} className="fil-item" onClick={() => goToChantier(a.cid)}>
                <div className="fil-item-ico">{a.icon}</div>
                <div className="fil-item-body">
                  <div className="fil-item-lbl">{a.lbl}</div>
                  <div className="fil-item-det">{a.det}</div>
                </div>
                {a.date && <div className="fil-item-date">{formatDateTime(a.date)}</div>}
              </div>
            ))
          )}
          {filtActus.length > 5 && (
            <button
              className="btn bg bsm dash-more"
              onClick={() => setFilShowAll((v) => !v)}
            >
              {filShowAll ? 'Voir moins ▲' : `Voir tout (${filtActus.length}) ▼`}
            </button>
          )}
        </div>

        {/* Mini planning */}
        <div className="card dash-full">
          <div className="card-head">
            <span className="card-title">Planning cette semaine</span>
            <button className="btn bg bsm" onClick={() => navigate('/planning')}>
              Voir tout →
            </button>
          </div>
          <div className="mini-plan-scroll">
            <table className="mini-plan">
              <thead>
                <tr>
                  <th></th>
                  {week5.map((d, i) => (
                    <th key={i}>{JOURS5[i]} {d.getDate()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {menuisiers.map((emp) => (
                  <tr key={emp.id}>
                    <td className="mini-plan-name">{emp.prenom}</td>
                    {week5.map((d, i) => {
                      const iso = isoDay(d)
                      const affs = (data?.affectations ?? []).filter(
                        (a) =>
                          a.sal_id === emp.id &&
                          a.date_debut <= iso &&
                          a.date_fin >= iso
                      )
                      return (
                        <td key={i} className="mini-plan-cell">
                          {affs.map((a, j) => (
                            <div
                              key={j}
                              className="mini-plan-block"
                              style={{ background: chantierColor[a.chantier_id] }}
                            >
                              {(a.chantier?.num ?? '').split('-')[0]}
                            </div>
                          ))}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ouvrages en cours */}
        <div className="card dash-full">
          <div className="card-head">
            <span className="card-title">
              Ouvrages en cours <span className="card-count">{filtOuvrages.length}</span>
            </span>
          </div>
          <div className="fil-type-row">
            <button
              className={'qf' + (ovFilt === 'tous' ? ' qf--on' : '')}
              onClick={() => setOvFilt('tous')}
            >
              Tous
            </button>
            {ACTIF_STATUTS.map((slug) => {
              const st = STATUT_OUVRAGE[slug]
              const on = ovFilt === slug
              return (
                <button
                  key={slug}
                  className="qf"
                  style={
                    on
                      ? { background: st.color + '22', color: st.color, borderColor: st.color }
                      : undefined
                  }
                  onClick={() => setOvFilt(slug)}
                >
                  {st.label}
                </button>
              )
            })}
          </div>
          {filtOuvrages.length === 0 ? (
            <div className="empty">Aucun ouvrage</div>
          ) : (
            filtOuvrages.slice(0, 6).map((o) => {
              const st = resolve(STATUT_OUVRAGE, o.statut)
              return (
                <div
                  key={o.id}
                  className="dash-ov"
                  onClick={() => goToChantier(o.chantier?.id)}
                >
                  <div className="dash-ov-body">
                    <div className="dash-ov-nom">{o.nom}</div>
                    <div className="dash-ov-num mono">{o.chantier?.num}</div>
                  </div>
                  <span className={'stbadge ' + st.cls}>
                    <span className="stdot" style={{ backgroundColor: st.color }} />
                    {st.label}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {showTaskModal && (
        <TaskModal
          chantiers={data?.chantiers ?? []}
          employes={data?.employes ?? []}
          onClose={() => setShowTaskModal(false)}
          onSaved={async () => {
            setShowTaskModal(false)
            await reload()
          }}
        />
      )}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          chantiers={data?.chantiers ?? []}
          employes={data?.employes ?? []}
          onClose={() => setEditingTask(null)}
          onSaved={async () => {
            setEditingTask(null)
            await reload()
          }}
        />
      )}
    </section>
  )
}

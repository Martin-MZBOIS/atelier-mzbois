import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { SkelList } from '../components/Skeleton'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store'
import { toast } from '../store/toasts'
import { formatDate } from '../lib/format'
import { STATUT_COURSE, STATUT_COURSE_ORDER, resolve } from '../lib/statuts'
import CourseModal from './CourseModal'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const CAL_STATUTS = ['programmee', 'urgente', 'en_cours']
const PAGE_SIZE = 30

function typeIcon(t) {
  if (t === 'ramasse') return '📥 Ramasse'
  if (t === 'tournee') return '🔄 Tournée'
  return '🚚 Livraison'
}

// Date locale AAAA-MM-JJ (évite le décalage UTC de toISOString en UTC+).
function isoDay(d) {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}
function ddmm(d) {
  return (
    String(d.getDate()).padStart(2, '0') +
    '/' +
    String(d.getMonth() + 1).padStart(2, '0')
  )
}

export default function CoursesGlobal() {
  const user = useAuthStore((s) => s.user)
  const [courses, setCourses] = useState([])
  const [chantiers, setChantiers] = useState([])
  const [employes, setEmployes] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('liste')
  const [filter, setFilter] = useState('tous')
  const [coursier, setCoursier] = useState('tous')
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [calMode, setCalMode] = useState('sem') // 'sem' | 'mois'
  const [showModal, setShowModal] = useState(false)
  const [editCourse, setEditCourse] = useState(null)
  const [newDate, setNewDate] = useState(null) // date pré-remplie (clic case calendrier)
  const [visible, setVisible] = useState(PAGE_SIZE)

  async function loadCourses() {
    const full =
      'id, date, heure_depart, type_course, etapes, ouvrage_ids, de_libelle, vers_libelle, ' +
      'cout_ht, chantier_impute_id, ' +
      'statut, qui_id, qui_type, de_id, vers_id, quoi, commentaire, chantier_id, ' +
      'chantier:chantiers!chantier_id(num, nom)'
    const core =
      'id, date, statut, qui_id, qui_type, de_id, vers_id, quoi, commentaire, chantier_id, ' +
      'chantier:chantiers!chantier_id(num, nom)'
    let { data, error: dbError } = await supabase.from('courses').select(full).order('date', { ascending: true })
    if (dbError && /(type_course|etapes|ouvrage_ids|de_libelle|vers_libelle|heure_depart|cout_ht|chantier_impute_id)/.test(dbError.message)) {
      ;({ data, error: dbError } = await supabase.from('courses').select(core).order('date', { ascending: true }))
    }
    if (dbError) {
      setError(dbError.message)
      setCourses([])
    } else {
      setCourses(data ?? [])
    }
  }

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const [, ch, em, fo] = await Promise.all([
        loadCourses(),
        supabase.from('chantiers').select('id, num, nom').order('num'),
        supabase.from('employes').select('id, prenom, nom').order('nom'),
        supabase
          .from('fournisseurs')
          .select('id, nom, type, contacts:contacts!fournisseur_id(email)')
          .order('nom'),
      ])
      if (!active) return
      setChantiers(ch.data ?? [])
      setEmployes(em.data ?? [])
      setFournisseurs(fo.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  // Maps de résolution (références polymorphes qui/de/vers sans FK).
  const empMap = useMemo(() => {
    const m = {}
    for (const e of employes) m[e.id] = `${e.prenom} ${e.nom}`
    return m
  }, [employes])
  const fourMap = useMemo(() => {
    const m = {}
    for (const f of fournisseurs) m[f.id] = f.nom
    return m
  }, [fournisseurs])
  const transporteurs = useMemo(
    () => fournisseurs.filter((f) => f.type === 'transporteur'),
    [fournisseurs]
  )
  const transporteurEmail = useMemo(() => {
    const m = {}
    for (const f of transporteurs) m[f.id] = f.contacts?.[0]?.email ?? null
    return m
  }, [transporteurs])
  const chMap = useMemo(() => {
    const m = {}
    for (const c of chantiers) m[c.id] = c.num
    return m
  }, [chantiers])

  function quiName(c) {
    if (c.qui_type === 'employe') return empMap[c.qui_id] ?? '—'
    if (c.qui_type === 'transporteur' || c.qui_type === 'fournisseur')
      return fourMap[c.qui_id] ?? '—'
    return empMap[c.qui_id] ?? fourMap[c.qui_id] ?? '—'
  }
  function lieuName(id) {
    if (!id) return '—'
    return fourMap[id] ?? chMap[id] ?? empMap[id] ?? '—'
  }

  async function changeStatut(id, newStatut) {
    const previous = courses
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, statut: newStatut } : c))
    )
    const { error: dbError } = await supabase
      .from('courses')
      .update({ statut: newStatut })
      .eq('id', id)
    if (dbError) {
      setCourses(previous)
      setError('Échec de la mise à jour : ' + dbError.message)
      toast.error('Statut non enregistré : ' + dbError.message)
    } else {
      toast('Statut de la course mis à jour')
    }
  }

  // Options du filtre coursier : employés + coursiers externes (transporteurs).
  const coursierOptions = useMemo(
    () => [
      ...employes.map((e) => ({ id: e.id, label: `${e.prenom} ${e.nom}` })),
      ...transporteurs.map((t) => ({ id: t.id, label: t.nom })),
    ],
    [employes, transporteurs]
  )

  const filtered = useMemo(
    () =>
      courses.filter(
        (c) =>
          (filter === 'tous' || c.statut === filter) &&
          (coursier === 'tous' || c.qui_id === coursier)
      ),
    [courses, filter, coursier]
  )

  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [filter, coursier])

  const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible])

  // Semaine courante (lundi) + offset
  const week = useMemo(() => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7)
    monday.setHours(0, 0, 0, 0)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }, [weekOffset])

  // Grille du mois : semaines (lundi→dimanche) couvrant le mois affiché.
  const month = useMemo(() => {
    const today = new Date()
    const first = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
    const monthIndex = first.getMonth()
    // Recule au lundi de la semaine du 1er.
    const start = new Date(first)
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7))
    const weeks = []
    const cursor = new Date(start)
    for (let w = 0; w < 6; w++) {
      const row = []
      for (let d = 0; d < 7; d++) {
        row.push({ date: new Date(cursor), inMonth: cursor.getMonth() === monthIndex })
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push(row)
      if (cursor.getMonth() !== monthIndex && cursor > first) {
        // stoppe si la semaine suivante est entièrement hors du mois
        if (row.every((c) => !c.inMonth) && w >= 4) break
      }
    }
    return { label: first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), weeks }
  }, [monthOffset])

  const todayIso = isoDay(new Date())

  // Bloc course dans le calendrier (semaine + mois).
  function CalCourse({ c }) {
    const st = resolve(STATUT_COURSE, c.statut)
    const heure = c.heure_depart ? c.heure_depart.slice(0, 5) : null
    const style = { background: st.color + '22', borderLeftColor: st.color, color: st.color }
    return (
      <div
        className="cal-course"
        style={style}
        onClick={(e) => {
          e.stopPropagation()
          setEditCourse(c)
        }}
        title="Modifier la course"
      >
        {c.type_course === 'tournee' ? (
          <>
            <div className="cal-course-qui">🔄 Tournée — {(c.etapes ?? []).length} étapes</div>
            <div className="cal-course-quoi">
              {quiName(c)}
              {heure ? ' · ' + heure : ''}
            </div>
          </>
        ) : (
          <>
            <div className="cal-course-qui">
              {c.type_course === 'ramasse' ? '📥' : '🚚'} {quiName(c)}
            </div>
            <div className="cal-course-quoi">
              {(c.de_libelle ?? lieuName(c.de_id))} → {(c.vers_libelle ?? lieuName(c.vers_id))}
            </div>
            <div className="cal-course-meta">
              {c.chantier?.num && <span className="mono">{c.chantier.num}</span>}
              {heure && <span>🕘 {heure}</span>}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <section className="page">
      <div className="page-head">
        <h2>Courses</h2>
        <button
          className="btn bp bsm"
          style={{ marginLeft: 'auto' }}
          onClick={() => setShowModal(true)}
        >
          + Nouvelle course
        </button>
      </div>

      <nav className="subtabs">
        <button
          className={'subtab' + (view === 'liste' ? ' subtab--active' : '')}
          onClick={() => setView('liste')}
        >
          📋 Liste
        </button>
        <button
          className={'subtab' + (view === 'cal' ? ' subtab--active' : '')}
          onClick={() => setView('cal')}
        >
          📅 Calendrier
        </button>
      </nav>

      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}
      {loading && <SkelList rows={6} />}

      {!loading && view === 'liste' && (
        <>
          <div className="course-filters" style={{ alignItems: 'center' }}>
            <select
              className="ss"
              value={coursier}
              onChange={(e) => setCoursier(e.target.value)}
              title="Filtrer par coursier"
            >
              <option value="tous">Tous les coursiers</option>
              {coursierOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            {['tous', ...STATUT_COURSE_ORDER].map((slug) => {
              const on = filter === slug
              const meta = slug === 'tous' ? null : STATUT_COURSE[slug]
              const col = meta?.color ?? '#2c2420'
              return (
                <button
                  key={slug}
                  className="btn bg bsm"
                  style={
                    on
                      ? { background: col, color: '#fff', borderColor: col }
                      : undefined
                  }
                  onClick={() => setFilter(slug)}
                >
                  {slug === 'tous' ? 'Toutes' : meta.label}
                </button>
              )
            })}
          </div>

          <div className="course-list">
            {shown.map((c) => {
              const st = resolve(STATUT_COURSE, c.statut)
              return (
                <div
                  key={c.id}
                  className="course-card course-card--click"
                  style={{ borderLeftColor: st.color }}
                  onClick={() => setEditCourse(c)}
                  title="Modifier la course"
                >
                  <div className="course-top">
                    <div className="course-top-left">
                      <span className="course-date mono">{formatDate(c.date)}</span>
                      {c.type_course && (
                        <span className="course-type-badge">{typeIcon(c.type_course)}</span>
                      )}
                      <span
                        className="aspill"
                        style={{ color: st.color, backgroundColor: st.color + '22' }}
                      >
                        {st.label}
                      </span>
                    </div>
                    <div className="course-top-right" onClick={(e) => e.stopPropagation()}>
                      {c.qui_type === 'transporteur' && (
                        <a
                          className="btn bg bsm"
                          href={
                            'mailto:' +
                            (transporteurEmail[c.qui_id] ?? '') +
                            '?subject=' +
                            encodeURIComponent(
                              'Course ' + (c.chantier?.num ?? '') + ' — ' + (c.quoi ?? '')
                            )
                          }
                        >
                          📧 Mail
                        </a>
                      )}
                      <select
                        className="ss"
                        value={c.statut ?? ''}
                        onChange={(e) => changeStatut(c.id, e.target.value)}
                      >
                        {c.statut == null && <option value="">—</option>}
                        {STATUT_COURSE_ORDER.map((slug) => (
                          <option key={slug} value={slug}>
                            {STATUT_COURSE[slug].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {c.type_course === 'tournee' ? (
                    <div className="course-grid">
                      <div>
                        <div className="course-lbl">QUI</div>
                        <div className="course-val">{quiName(c)}</div>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <div className="course-lbl">TOURNÉE ({(c.etapes ?? []).length} étapes)</div>
                        <div className="course-val">
                          {(c.etapes ?? []).map((e) => e.label).join(' → ') || '—'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="course-grid">
                      <div>
                        <div className="course-lbl">QUI</div>
                        <div className="course-val">{quiName(c)}</div>
                      </div>
                      <div>
                        <div className="course-lbl">DE</div>
                        <div className="course-val">{c.de_libelle ?? lieuName(c.de_id)}</div>
                      </div>
                      <div>
                        <div className="course-lbl">VERS</div>
                        <div className="course-val">{c.vers_libelle ?? lieuName(c.vers_id)}</div>
                      </div>
                    </div>
                  )}

                  <div className="course-foot">
                    {c.chantier && (
                      <span>
                        🏗 <strong>{c.chantier.num}</strong>
                      </span>
                    )}
                    {c.quoi && <span>📦 {c.quoi}</span>}
                    {c.commentaire && (
                      <span className="course-com">💬 {c.commentaire}</span>
                    )}
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <EmptyState
                ico="🚚"
                titre="Aucune course"
                aide="Aucune course ne correspond à ces filtres."
              />
            )}
          </div>
          {filtered.length > visible && (
            <div className="load-more">
              <button className="btn bg bsm" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Charger plus ({filtered.length - visible} restants)
              </button>
            </div>
          )}
        </>
      )}

      {!loading && view === 'cal' && (
        <>
          <div className="cal-nav">
            <button
              className="btn bg bsm"
              onClick={() =>
                calMode === 'sem'
                  ? setWeekOffset((w) => w - 1)
                  : setMonthOffset((m) => m - 1)
              }
            >
              ← Préc.
            </button>
            <span className="cal-period" style={{ textTransform: 'capitalize' }}>
              {calMode === 'sem' ? `${ddmm(week[0])} – ${ddmm(week[6])}` : month.label}
            </span>
            <button
              className="btn bg bsm"
              onClick={() =>
                calMode === 'sem'
                  ? setWeekOffset((w) => w + 1)
                  : setMonthOffset((m) => m + 1)
              }
            >
              Suiv. →
            </button>
            <div className="view-toggle" style={{ marginLeft: 6 }}>
              <button className={'vt' + (calMode === 'sem' ? ' vt--on' : '')} onClick={() => setCalMode('sem')}>
                Semaine
              </button>
              <button className={'vt' + (calMode === 'mois' ? ' vt--on' : '')} onClick={() => setCalMode('mois')}>
                Mois
              </button>
            </div>
          </div>

          {calMode === 'mois' && (
            <div className="cal-scroll">
              <table className="cal-table cal-month">
                <thead>
                  <tr>
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((j, i) => (
                      <th key={i} className={'cal-th' + (i >= 5 ? ' cal-th--we' : '')}>{j}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {month.weeks.map((row, wi) => (
                    <tr key={wi}>
                      {row.map((cell, di) => {
                        const iso = isoDay(cell.date)
                        const isT = iso === todayIso
                        const we = cell.date.getDay() === 0 || cell.date.getDay() === 6
                        const dayCourses = courses.filter(
                          (c) => c.date === iso && CAL_STATUTS.includes(c.statut)
                        )
                        return (
                          <td
                            key={di}
                            className={
                              'cal-cell cal-month-cell' +
                              (!cell.inMonth ? ' cal-cell--out' : isT ? ' cal-cell--today' : we ? ' cal-cell--we' : '') +
                              (cell.inMonth ? ' cal-cell--click' : '')
                            }
                            onClick={cell.inMonth ? () => setNewDate(iso) : undefined}
                          >
                            <div className="cal-month-daynum">{cell.date.getDate()}</div>
                            {dayCourses.map((c) => (
                              <CalCourse key={c.id} c={c} />
                            ))}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {calMode === 'sem' && (
          <div className="cal-scroll">
            <table className="cal-table">
              <thead>
                <tr>
                  {week.map((d, i) => {
                    const we = d.getDay() === 0 || d.getDay() === 6
                    const isT = isoDay(d) === todayIso
                    return (
                      <th
                        key={i}
                        className={
                          'cal-th' +
                          (isT ? ' cal-th--today' : we ? ' cal-th--we' : '')
                        }
                      >
                        {JOURS[i]}
                        <br />
                        <span className="cal-daynum">{d.getDate()}</span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {week.map((d, i) => {
                    const iso = isoDay(d)
                    const we = d.getDay() === 0 || d.getDay() === 6
                    const isT = iso === todayIso
                    const dayCourses = courses.filter(
                      (c) => c.date === iso && CAL_STATUTS.includes(c.statut)
                    )
                    return (
                      <td
                        key={i}
                        className={
                          'cal-cell cal-cell--click' +
                          (isT ? ' cal-cell--today' : we ? ' cal-cell--we' : '')
                        }
                        onClick={() => setNewDate(iso)}
                      >
                        {dayCourses.map((c) => (
                          <CalCourse key={c.id} c={c} />
                        ))}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          )}
        </>
      )}

      {(showModal || newDate) && (
        <CourseModal
          chantiers={chantiers}
          employes={employes}
          transporteurs={transporteurs}
          fournisseurs={fournisseurs}
          user={user}
          defaultDate={newDate ?? undefined}
          onClose={() => { setShowModal(false); setNewDate(null) }}
          onSaved={async () => {
            setShowModal(false)
            setNewDate(null)
            await loadCourses()
          }}
        />
      )}
      {editCourse && (
        <CourseModal
          chantiers={chantiers}
          employes={employes}
          transporteurs={transporteurs}
          fournisseurs={fournisseurs}
          user={user}
          course={editCourse}
          onClose={() => setEditCourse(null)}
          onSaved={async () => {
            setEditCourse(null)
            await loadCourses()
          }}
        />
      )}
    </section>
  )
}

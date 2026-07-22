import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SkelTable } from '../components/Skeleton'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import { PHASE_PLANNING, resolve } from '../lib/statuts'
import PlanAffectationModal from './PlanAffectationModal'

const JOUR_LETTER = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const CHANTIER_COLORS = [
  '#FEE2E2', '#DBEAFE', '#D1FAE5', '#EDE9FE', '#FEF3C7', '#FCE7F3', '#E0F2FE',
]
const PHASES = [
  { slug: 'etude', label: 'Étude', color: '#4a6b8a' },
  { slug: 'fabrication', label: 'Fabrication', color: '#6b5a8a' },
  { slug: 'pose', label: 'Pose', color: '#5a7a5a' },
]

function isoDay(d) {
  return (
    d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
  )
}
function ddmm(d) {
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0')
}

export default function PlanningGlobal() {
  const [affectations, setAffectations] = useState([])
  const [employes, setEmployes] = useState([])
  const [chantiers, setChantiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('sal') // 'sal' | 'ch'
  const [periodMode, setPeriodMode] = useState('sem') // 'sem' | 'mois'
  const [periodOffset, setPeriodOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState({}) // chantiers dépliés (vue chantiers)
  const [newAff, setNewAff] = useState(null)
  const [editAff, setEditAff] = useState(null) // affectation en cours d'édition
  const [menu, setMenu] = useState(null) // menu contextuel { aff, x, y }

  const loadAffectations = useCallback(async () => {
    const full = 'id, chantier_id, phase, sal_id, date_debut, date_fin, commentaire, heure_debut, heure_fin'
    const core = 'id, chantier_id, phase, sal_id, date_debut, date_fin, commentaire'
    let { data, error: dbError } = await supabase.from('plan_affectations').select(full)
    if (dbError && /heure_/.test(dbError.message)) {
      ;({ data, error: dbError } = await supabase.from('plan_affectations').select(core))
    }
    if (dbError) setError(dbError.message)
    else setAffectations(data ?? [])
  }, [])

  // Temps réel : le planning se met à jour quand un autre utilisateur affecte.
  useRealtime('plan_affectations', loadAffectations)

  const dragAffRef = useRef(null)
  const resizeRef = useRef(null) // { affId, dateFin } pendant un redimensionnement

  // Déplacement d'un bloc (glisser vers une cellule vide).
  function onDragStartBlock(e, aff) {
    dragAffRef.current = aff
    e.dataTransfer.effectAllowed = 'move'
  }
  async function onDropCell(emp, iso) {
    const aff = dragAffRef.current
    dragAffRef.current = null
    if (!aff) return
    const durDays = Math.round(
      (new Date(aff.date_fin) - new Date(aff.date_debut)) / 86400000
    )
    const fin = new Date(iso + 'T00:00:00')
    fin.setDate(fin.getDate() + durDays)
    const { error: dbError } = await supabase
      .from('plan_affectations')
      .update({ sal_id: emp.id, date_debut: iso, date_fin: isoDay(fin) })
      .eq('id', aff.id)
    if (dbError) setError(dbError.message)
    await loadAffectations()
  }

  // Redimensionnement d'un bloc (glisser le bord droit) — étend la date de fin.
  function onResizeStart(e, aff) {
    e.preventDefault()
    e.stopPropagation()
    const th = document.querySelector('.plan-th-day')
    const cellW = th ? th.getBoundingClientRect().width : 44
    const startX = e.clientX
    const origFin = new Date(aff.date_fin + 'T00:00:00')
    const debut = aff.date_debut
    resizeRef.current = { affId: aff.id, dateFin: aff.date_fin }

    function onMove(ev) {
      const deltaDays = Math.round((ev.clientX - startX) / cellW)
      const fin = new Date(origFin)
      fin.setDate(origFin.getDate() + deltaDays)
      let iso = isoDay(fin)
      if (iso < debut) iso = debut
      resizeRef.current = { affId: aff.id, dateFin: iso }
      setAffectations((prev) =>
        prev.map((a) => (a.id === aff.id ? { ...a, date_fin: iso } : a))
      )
    }
    async function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      const r = resizeRef.current
      resizeRef.current = null
      if (r && r.dateFin !== aff.date_fin) {
        const { error: dbError } = await supabase
          .from('plan_affectations')
          .update({ date_fin: r.dateFin })
          .eq('id', r.affId)
        if (dbError) setError(dbError.message)
        await loadAffectations()
      }
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const [, em, ch] = await Promise.all([
        loadAffectations(),
        supabase.from('employes').select('id, prenom, nom, role, couleur').order('nom'),
        supabase.from('chantiers').select('id, num, nom, client').order('num'),
      ])
      if (!active) return
      setEmployes(em.data ?? [])
      setChantiers(ch.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [loadAffectations])

  const empMap = useMemo(() => {
    const m = {}
    for (const e of employes) m[e.id] = e
    return m
  }, [employes])
  const chantierColor = useMemo(() => {
    const m = {}
    chantiers.forEach((c, i) => (m[c.id] = CHANTIER_COLORS[i % CHANTIER_COLORS.length]))
    return m
  }, [chantiers])

  function changePeriodMode(mode) {
    setPeriodMode(mode)
    setPeriodOffset(0)
  }
  function changeViewMode(mode) {
    setViewMode(mode)
    setSearch('')
  }

  // Jours affichés selon le mode.
  const days = useMemo(() => {
    const today = new Date()
    if (periodMode === 'sem') {
      const monday = new Date(today)
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + periodOffset * 7)
      monday.setHours(0, 0, 0, 0)
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        return d
      })
    }
    const m = today.getMonth() + periodOffset
    const first = new Date(today.getFullYear(), m, 1)
    const dpm = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    return Array.from({ length: dpm }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1))
  }, [periodMode, periodOffset])

  const periodLabel =
    periodMode === 'sem'
      ? `${ddmm(days[0])} – ${ddmm(days[days.length - 1])}`
      : days[0].toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const todayIso = isoDay(new Date())
  const isMonth = periodMode === 'mois'

  const filteredEmployes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employes
    return employes.filter((e) => `${e.prenom} ${e.nom}`.toLowerCase().includes(q))
  }, [employes, search])

  const filteredChantiers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return chantiers
    return chantiers.filter(
      (c) =>
        (c.num ?? '').toLowerCase().includes(q) ||
        (c.client ?? '').toLowerCase().includes(q)
    )
  }, [chantiers, search])

  // Fusionne les affectations multi-jours d'un salarié en colspan.
  // Supprime une affectation (menu contextuel).
  async function deleteAff(aff) {
    setMenu(null)
    const { error: dbError } = await supabase.from('plan_affectations').delete().eq('id', aff.id)
    if (dbError) setError(dbError.message)
    await loadAffectations()
  }

  // Ferme le menu contextuel au clic ailleurs.
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menu])

  function buildRowFromAffs(affs) {
    const cells = []
    let di = 0
    while (di < days.length) {
      const iso = isoDay(days[di])
      const aff = affs.find(
        (a) => a.date_debut && a.date_fin && a.date_debut <= iso && a.date_fin >= iso
      )
      if (aff) {
        let span = 0
        for (let j = di; j < days.length; j++) {
          const dj = isoDay(days[j])
          if (dj >= aff.date_debut && dj <= aff.date_fin) span++
          else break
        }
        cells.push({ type: 'aff', aff, span, key: aff.id })
        di += span
      } else {
        cells.push({ type: 'empty', key: 'e' + di, day: days[di] })
        di += 1
      }
    }
    return cells
  }

  // Répartit les affectations d'un salarié en pistes (lanes) : deux affectations
  // qui se chevauchent dans le temps vont sur des pistes différentes, ce qui
  // permet de les empiler verticalement dans la même cellule/journée.
  function computeLanes(affs) {
    const sorted = [...affs].sort((a, b) =>
      a.date_debut < b.date_debut ? -1 : a.date_debut > b.date_debut ? 1 : 0
    )
    const lanes = []
    for (const aff of sorted) {
      let placed = false
      for (const lane of lanes) {
        const last = lane[lane.length - 1]
        if (last.date_fin < aff.date_debut) {
          lane.push(aff)
          placed = true
          break
        }
      }
      if (!placed) lanes.push([aff])
    }
    return lanes
  }

  function DayHeaders() {
    return days.map((d, i) => {
      const we = d.getDay() === 0 || d.getDay() === 6
      const isT = isoDay(d) === todayIso
      return (
        <th
          key={i}
          className={'plan-th-day' + (isT ? ' plan-th-day--today' : we ? ' plan-th-day--we' : '')}
        >
          {JOUR_LETTER[d.getDay()]}
          <br />
          <span className="plan-daynum">{d.getDate()}</span>
        </th>
      )
    })
  }

  return (
    <section className="page">
      <div className="page-head">
        <h2>Planning</h2>
      </div>

      <nav className="subtabs">
        <button
          className={'subtab' + (viewMode === 'sal' ? ' subtab--active' : '')}
          onClick={() => changeViewMode('sal')}
        >
          👷 Salariés
        </button>
        <button
          className={'subtab' + (viewMode === 'ch' ? ' subtab--active' : '')}
          onClick={() => changeViewMode('ch')}
        >
          🏗 Chantiers
        </button>
      </nav>

      <div className="cal-nav" style={{ marginBottom: 12 }}>
        <button className="btn bg bsm" onClick={() => setPeriodOffset((w) => w - 1)}>← Préc.</button>
        <span className="cal-period" style={{ textTransform: 'capitalize' }}>{periodLabel}</span>
        <button className="btn bg bsm" onClick={() => setPeriodOffset((w) => w + 1)}>Suiv. →</button>
        <div className="view-toggle" style={{ marginLeft: 6 }}>
          <button className={'vt' + (periodMode === 'sem' ? ' vt--on' : '')} onClick={() => changePeriodMode('sem')}>Semaine</button>
          <button className={'vt' + (periodMode === 'mois' ? ' vt--on' : '')} onClick={() => changePeriodMode('mois')}>Mois</button>
        </div>
      </div>

      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}

      <input
        className="plan-search"
        placeholder={viewMode === 'sal' ? '🔍 Rechercher un salarié…' : '🔍 Rechercher un chantier…'}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {viewMode === 'sal' && (
        <div className="plan-legend">
          {chantiers.map((c) => (
            <div key={c.id} className="plan-legend-item">
              <span className="plan-legend-dot" style={{ background: chantierColor[c.id] }} />
              {c.num}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <SkelTable rows={7} cols={6} />
      ) : (
        <div className="plan-scroll">
          <table className={'plan-table' + (isMonth ? ' plan-table--month' : '')}>
            <thead>
              <tr>
                <th className="plan-th-name">{viewMode === 'sal' ? 'Salarié' : 'Chantier / Phase'}</th>
                <DayHeaders />
              </tr>
            </thead>
            <tbody>
              {viewMode === 'sal' &&
                filteredEmployes.flatMap((emp) => {
                  const empAffs = affectations.filter(
                    (a) => a.sal_id === emp.id && a.date_debut && a.date_fin
                  )
                  const lanes = computeLanes(empAffs)
                  if (lanes.length === 0) lanes.push([])
                  const nb = lanes.length
                  const multi = nb >= 2
                  const dense = nb >= 3
                  const cellCls = 'plan-cell' + (multi ? ' plan-cell--stacked' : '')
                  return lanes.map((laneAffs, li) => (
                    <tr key={emp.id + '-' + li}>
                      {li === 0 && (
                        <td className="plan-emp" rowSpan={nb}>
                          <div className="plan-emp-inner">
                            <div
                              className="plan-avatar"
                              style={emp.couleur ? { background: emp.couleur } : undefined}
                            >
                              {(emp.prenom?.[0] ?? '') + (emp.nom?.[0] ?? '')}
                            </div>
                            <div>
                              <div className="plan-emp-name">{emp.prenom} {emp.nom}</div>
                              <div className="plan-emp-role">{emp.role ?? ''}</div>
                            </div>
                          </div>
                        </td>
                      )}
                      {buildRowFromAffs(laneAffs).map((cell) => {
                        if (cell.type === 'empty') {
                          const we = cell.day.getDay() === 0 || cell.day.getDay() === 6
                          const isT = isoDay(cell.day) === todayIso
                          return (
                            <td
                              key={cell.key}
                              className={cellCls + ' plan-cell--empty' + (isT ? ' plan-cell--today' : we ? ' plan-cell--we' : '')}
                              title="Affecter un chantier"
                              onClick={() => setNewAff({ salId: emp.id, date: isoDay(cell.day) })}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => onDropCell(emp, isoDay(cell.day))}
                            />
                          )
                        }
                        const { aff, span } = cell
                        const ch = chantiers.find((c) => c.id === aff.chantier_id)
                        const phase = aff.phase ? resolve(PHASE_PLANNING, aff.phase).label : ''
                        return (
                          <td key={cell.key} colSpan={span} className={cellCls} title={aff.commentaire ?? ''}>
                            <div
                              className={'plan-block plan-block--draggable' + (dense ? ' plan-block--dense' : '')}
                              draggable
                              onDragStart={(e) => onDragStartBlock(e, aff)}
                              onClick={() => setEditAff(aff)}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                setMenu({ aff, x: e.clientX, y: e.clientY })
                              }}
                              title="Cliquer pour modifier · clic droit pour supprimer"
                              style={{
                                background: chantierColor[aff.chantier_id],
                                borderLeft: `4px solid ${emp.couleur ?? 'transparent'}`,
                              }}
                            >
                              <div className="plan-block-num">{ch?.num ?? '?'}</div>
                              {!dense && (
                                <div className="plan-block-sub">
                                  {(ch?.client ?? '').slice(0, 16)}
                                  {span > 1 ? ` · ${span}j` : ''}
                                </div>
                              )}
                              {phase && !dense && <div className="plan-block-phase">{phase}</div>}
                              <div
                                className="plan-block-resize"
                                title="Étendre"
                                onMouseDown={(e) => onResizeStart(e, aff)}
                                onDragStart={(e) => e.stopPropagation()}
                              >
                                ⟩
                              </div>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))
                })}

              {viewMode === 'ch' &&
                filteredChantiers.map((c) => {
                  const isOpen = open[c.id] !== false // ouvert par défaut
                  return (
                    <Fragment key={c.id}>
                      <tr>
                        <td
                          colSpan={days.length + 1}
                          className="plan-ch-head"
                          onClick={() => setOpen((o) => ({ ...o, [c.id]: !isOpen }))}
                        >
                          <span className="plan-ch-chevron">{isOpen ? '▼' : '▶'}</span>
                          <span className="plan-legend-dot" style={{ background: chantierColor[c.id] }} />
                          <span className="plan-ch-num">{c.num}</span>
                          <span className="plan-ch-client">{c.client}</span>
                        </td>
                      </tr>
                      {isOpen &&
                        PHASES.map((ph) => {
                          const pAffs = affectations.filter((a) => a.chantier_id === c.id && a.phase === ph.slug)
                          const salNames = [
                            ...new Set(pAffs.map((a) => empMap[a.sal_id]?.prenom).filter(Boolean)),
                          ].join(', ')
                          return (
                            <tr key={ph.slug}>
                              <td className="plan-phase-cell">
                                <div className="plan-phase-head">
                                  <span className="plan-phase-lbl" style={{ color: ph.color }}>
                                    <span className="plan-phase-dot" style={{ background: ph.color }} />
                                    {ph.label}
                                  </span>
                                  <button
                                    className="plan-affecter-btn"
                                    onClick={() => setNewAff({ chantierId: c.id, phase: ph.slug })}
                                  >
                                    + Affecter
                                  </button>
                                </div>
                                {salNames && <div className="plan-phase-sal">{salNames}</div>}
                              </td>
                              {buildRowFromAffs(pAffs).map((cell) => {
                                if (cell.type === 'empty') {
                                  const iso = isoDay(cell.day)
                                  const we = cell.day.getDay() === 0 || cell.day.getDay() === 6
                                  const isT = iso === todayIso
                                  return (
                                    <td
                                      key={cell.key}
                                      className={'plan-cell plan-cell--empty' + (isT ? ' plan-cell--today' : we ? ' plan-cell--we' : '')}
                                      title="Affecter"
                                      onClick={() => setNewAff({ chantierId: c.id, phase: ph.slug, date: iso })}
                                    />
                                  )
                                }
                                const { aff, span } = cell
                                const emp = empMap[aff.sal_id]
                                return (
                                  <td key={cell.key} colSpan={span} className="plan-cell" title={aff.commentaire ?? ''}>
                                    <div
                                      className="plan-block"
                                      onClick={() => setEditAff(aff)}
                                      onContextMenu={(e) => {
                                        e.preventDefault()
                                        setMenu({ aff, x: e.clientX, y: e.clientY })
                                      }}
                                      title="Cliquer pour modifier · clic droit pour supprimer"
                                      style={{ background: ph.color + '55', borderLeft: `4px solid ${ph.color}` }}
                                    >
                                      <div className="plan-block-num">{emp?.prenom ?? '?'}</div>
                                      {span > 1 && <div className="plan-block-sub">{span}j</div>}
                                      <div
                                        className="plan-block-resize"
                                        title="Étendre"
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => onResizeStart(e, aff)}
                                      >
                                        ⟩
                                      </div>
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                    </Fragment>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}

      {newAff && (
        <PlanAffectationModal
          chantiers={chantiers}
          salaries={employes}
          salarie={newAff.salId ? employes.find((e) => e.id === newAff.salId) : undefined}
          prefill={newAff.chantierId ? { chantier_id: newAff.chantierId, phase: newAff.phase } : undefined}
          initialDate={newAff.date}
          onClose={() => setNewAff(null)}
          onSaved={async () => {
            setNewAff(null)
            await loadAffectations()
          }}
        />
      )}

      {editAff && (
        <PlanAffectationModal
          chantiers={chantiers}
          salaries={employes}
          affectation={editAff}
          onClose={() => setEditAff(null)}
          onSaved={async () => {
            setEditAff(null)
            await loadAffectations()
          }}
        />
      )}

      {menu && (
        <div className="ctx-menu" style={{ top: menu.y, left: menu.x }}>
          <button className="ctx-menu-item" onClick={() => deleteAff(menu.aff)}>
            🗑 Supprimer l’affectation
          </button>
        </div>
      )}
    </section>
  )
}

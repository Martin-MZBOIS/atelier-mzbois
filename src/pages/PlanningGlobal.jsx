import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PHASE_PLANNING, resolve } from '../lib/statuts'
import PlanAffectationModal from './PlanAffectationModal'

const JOUR_LETTER = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
// Palette pastel pour distinguer les chantiers (reprise de la maquette).
const CHANTIER_COLORS = [
  '#FEE2E2',
  '#DBEAFE',
  '#D1FAE5',
  '#EDE9FE',
  '#FEF3C7',
  '#FCE7F3',
  '#E0F2FE',
]

// Date locale AAAA-MM-JJ (évite le décalage UTC de toISOString).
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

export default function PlanningGlobal() {
  const [affectations, setAffectations] = useState([])
  const [employes, setEmployes] = useState([])
  const [chantiers, setChantiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [newAff, setNewAff] = useState(null) // { salId, date }

  const loadAffectations = useCallback(async () => {
    const { data, error: dbError } = await supabase
      .from('plan_affectations')
      .select(
        'id, chantier_id, phase, sal_id, date_debut, date_fin, commentaire, ' +
          'chantier:chantiers!chantier_id(num, client)'
      )
    if (dbError) setError(dbError.message)
    else setAffectations(data ?? [])
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const [, em, ch] = await Promise.all([
        loadAffectations(),
        supabase.from('employes').select('id, prenom, nom, role').order('nom'),
        supabase.from('chantiers').select('id, num, nom').order('num'),
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

  // Couleur par chantier (index stable via l'ordre des chantiers).
  const chantierColor = useMemo(() => {
    const m = {}
    chantiers.forEach((c, i) => {
      m[c.id] = CHANTIER_COLORS[i % CHANTIER_COLORS.length]
    })
    return m
  }, [chantiers])

  // Jours de la semaine affichée (lundi -> dimanche).
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

  const todayIso = isoDay(new Date())

  const filteredEmployes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employes
    return employes.filter((e) =>
      `${e.prenom} ${e.nom}`.toLowerCase().includes(q)
    )
  }, [employes, search])

  // Construit les cellules d'un salarié en fusionnant les affectations
  // multi-jours en colspan.
  function buildRow(emp) {
    const cells = []
    let di = 0
    while (di < week.length) {
      const iso = isoDay(week[di])
      const aff = affectations.find(
        (a) =>
          a.sal_id === emp.id &&
          a.date_debut &&
          a.date_fin &&
          a.date_debut <= iso &&
          a.date_fin >= iso
      )
      if (aff) {
        let span = 0
        for (let j = di; j < week.length; j++) {
          const dj = isoDay(week[j])
          if (dj >= aff.date_debut && dj <= aff.date_fin) span++
          else break
        }
        cells.push({ type: 'aff', aff, span, key: aff.id })
        di += span
      } else {
        cells.push({ type: 'empty', key: 'e' + di, day: week[di] })
        di += 1
      }
    }
    return cells
  }

  return (
    <section className="page">
      <div className="page-head">
        <h2>Planning</h2>
        <span className="chip-view">👷 Salariés</span>
        <div className="cal-nav" style={{ marginLeft: 'auto' }}>
          <button className="btn bg bsm" onClick={() => setWeekOffset((w) => w - 1)}>
            ← Préc.
          </button>
          <span className="cal-period">
            {ddmm(week[0])} – {ddmm(week[6])}
          </span>
          <button className="btn bg bsm" onClick={() => setWeekOffset((w) => w + 1)}>
            Suiv. →
          </button>
        </div>
      </div>

      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}

      <input
        className="plan-search"
        placeholder="🔍 Rechercher un salarié…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Légende chantiers */}
      <div className="plan-legend">
        {chantiers.map((c) => (
          <div key={c.id} className="plan-legend-item">
            <span
              className="plan-legend-dot"
              style={{ background: chantierColor[c.id] }}
            />
            {c.num}
          </div>
        ))}
      </div>

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : (
        <div className="plan-scroll">
          <table className="plan-table">
            <thead>
              <tr>
                <th className="plan-th-name">Salarié</th>
                {week.map((d, i) => {
                  const we = d.getDay() === 0 || d.getDay() === 6
                  const isT = isoDay(d) === todayIso
                  return (
                    <th
                      key={i}
                      className={
                        'plan-th-day' +
                        (isT ? ' plan-th-day--today' : we ? ' plan-th-day--we' : '')
                      }
                    >
                      {JOUR_LETTER[d.getDay()]}
                      <br />
                      <span className="plan-daynum">{d.getDate()}</span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {filteredEmployes.map((emp) => {
                const cells = buildRow(emp)
                return (
                  <tr key={emp.id}>
                    <td className="plan-emp">
                      <div className="plan-emp-inner">
                        <div className="plan-avatar">
                          {(emp.prenom?.[0] ?? '') + (emp.nom?.[0] ?? '')}
                        </div>
                        <div>
                          <div className="plan-emp-name">
                            {emp.prenom} {emp.nom}
                          </div>
                          <div className="plan-emp-role">{emp.role ?? ''}</div>
                        </div>
                      </div>
                    </td>
                    {cells.map((cell) => {
                      if (cell.type === 'empty') {
                        const we =
                          cell.day.getDay() === 0 || cell.day.getDay() === 6
                        const isT = isoDay(cell.day) === todayIso
                        return (
                          <td
                            key={cell.key}
                            className={
                              'plan-cell plan-cell--empty' +
                              (isT
                                ? ' plan-cell--today'
                                : we
                                ? ' plan-cell--we'
                                : '')
                            }
                            title="Affecter un chantier"
                            onClick={() =>
                              setNewAff({
                                salId: emp.id,
                                date: isoDay(cell.day),
                              })
                            }
                          />
                        )
                      }
                      const { aff, span } = cell
                      const ch = aff.chantier
                      const phase = aff.phase
                        ? resolve(PHASE_PLANNING, aff.phase).label
                        : ''
                      return (
                        <td
                          key={cell.key}
                          colSpan={span}
                          className="plan-cell"
                          title={aff.commentaire ?? ''}
                        >
                          <div
                            className="plan-block"
                            style={{ background: chantierColor[aff.chantier_id] }}
                          >
                            <div className="plan-block-num">
                              {ch?.num ?? '?'}
                            </div>
                            <div className="plan-block-sub">
                              {(ch?.client ?? '').slice(0, 16)}
                              {span > 1 ? ` · ${span}j` : ''}
                            </div>
                            {phase && (
                              <div className="plan-block-phase">{phase}</div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {filteredEmployes.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
                    Aucun salarié.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {newAff && (
        <PlanAffectationModal
          salarie={employes.find((e) => e.id === newAff.salId)}
          chantiers={chantiers}
          initialDate={newAff.date}
          onClose={() => setNewAff(null)}
          onSaved={async () => {
            setNewAff(null)
            await loadAffectations()
          }}
        />
      )}
    </section>
  )
}

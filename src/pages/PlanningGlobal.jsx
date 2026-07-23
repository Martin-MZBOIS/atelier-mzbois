import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SkelTable } from '../components/Skeleton'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import { PHASE_PLANNING, resolve } from '../lib/statuts'
import { CRENEAUX, couvreApres, couvreMatin, creneauDe, heuresDe } from '../lib/creneaux'
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
// Couleur = type de travail (phase). À 40 chantiers, la couleur ne peut plus
// identifier le chantier — c'est le code qui le fait ; la couleur dit le métier.
const PHASE_COLOR = Object.fromEntries(PHASES.map((p) => [p.slug, p.color]))
const COULEUR_DEFAUT = '#8a7a6a'

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
  const [sel, setSel] = useState(null) // cliquer-glisser : { salId, aIso, bIso }

  const loadAffectations = useCallback(async () => {
    const full = 'id, chantier_id, phase, sal_id, date_debut, date_fin, commentaire, heure_debut, heure_fin'
    const avecOuvrage = full + ', ouvrage_id, ouvrage:ouvrages!ouvrage_id(nom)'
    const core = 'id, chantier_id, phase, sal_id, date_debut, date_fin, commentaire'
    const charger = (champs) => supabase.from('plan_affectations').select(champs)
    // Replis : ouvrage (0033) → horaires (0011) → cœur.
    let { data, error: dbError } = await charger(avecOuvrage)
    if (dbError && /ouvrage/i.test(dbError.message)) {
      ;({ data, error: dbError } = await charger(full))
    }
    if (dbError && /heure_/.test(dbError.message)) {
      ;({ data, error: dbError } = await charger(core))
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
  async function onDropCell(emp, iso, creneau = 'journee') {
    const aff = dragAffRef.current
    dragAffRef.current = null
    if (!aff) return
    const durDays = Math.round(
      (new Date(aff.date_fin) - new Date(aff.date_debut)) / 86400000
    )
    const fin = new Date(iso + 'T00:00:00')
    fin.setDate(fin.getDate() + durDays)
    // On déplace le bloc et on cale son créneau sur la moitié où on l'a lâché.
    const h = heuresDe(creneau, iso)
    const { error: dbError } = await supabase
      .from('plan_affectations')
      .update({
        sal_id: emp.id,
        date_debut: iso,
        date_fin: isoDay(fin),
        heure_debut: h.debut,
        heure_fin: h.fin,
      })
      .eq('id', aff.id)
    if (dbError) setError(dbError.message)
    await loadAffectations()
  }

  // Affectation d'un salarié couvrant un jour donné, côté matin ou après-midi.
  function affDuJour(empAffs, iso, moitie) {
    return empAffs.find((a) => {
      if (!(a.date_debut <= iso && a.date_fin >= iso)) return false
      const cr = creneauDe(a.heure_debut, a.heure_fin)
      return moitie === 'matin' ? couvreMatin(cr) : couvreApres(cr)
    })
  }

  // Sélection par cliquer-glisser sur des jours vides d'un salarié : on retient
  // le salarié + la plage survolée, et on ouvre l'affectation au relâchement.
  function selStart(salId, iso) {
    setSel({ salId, aIso: iso, bIso: iso })
  }
  function selOver(salId, iso) {
    setSel((s) => (s && s.salId === salId ? { ...s, bIso: iso } : s))
  }
  function dansSel(salId, iso) {
    if (!sel || sel.salId !== salId) return false
    const lo = sel.aIso <= sel.bIso ? sel.aIso : sel.bIso
    const hi = sel.aIso <= sel.bIso ? sel.bIso : sel.aIso
    return iso >= lo && iso <= hi
  }
  useEffect(() => {
    if (!sel) return
    function onUp() {
      const s = sel
      setSel(null)
      const lo = s.aIso <= s.bIso ? s.aIso : s.bIso
      const hi = s.aIso <= s.bIso ? s.bIso : s.aIso
      // Par défaut la journée entière ; la plage glissée fixe début → fin.
      setNewAff({ salId: s.salId, date: lo, dateFin: hi, creneau: 'journee' })
    }
    document.addEventListener('mouseup', onUp)
    return () => document.removeEventListener('mouseup', onUp)
  }, [sel])

  // Change le créneau d'une affectation (journée / matin / après-midi).
  // Journée = pas d'horaire ; matin/après = plage horaire correspondante.
  async function changerCreneau(aff, creneau) {
    const h = heuresDe(creneau, aff.date_debut)
    const { error: dbError } = await supabase
      .from('plan_affectations')
      .update({ heure_debut: h.debut, heure_fin: h.fin })
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
        supabase
          .from('chantiers')
          .select('id, num, nom, client, heures_vendues, heures_realisees')
          .order('num'),
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

  // Charge d'équipe (v1 globale). Capacité des deux familles de production —
  // fabrication (menuisiers) et étude (BE + programmeur) —, base horaire
  // entreprise. Demande = heures restant à produire sur les chantiers
  // (vendues − réalisées) ; un total, non ventilé par famille (l'affinage
  // viendra avec des heures par ouvrage).
  const charge = useMemo(() => {
    const HS = 39 // heures/semaine par personne (lun-jeu 8h30 + ven 5h)
    const nbFab = employes.filter((e) => e.role === 'Menuisier').length
    const nbEtude = employes.filter((e) => e.role === 'BE' || e.role === 'Prog').length
    const capFab = nbFab * HS
    const capEtude = nbEtude * HS
    const capTotale = capFab + capEtude
    let aProduire = 0
    const depassements = []
    for (const c of chantiers) {
      const reste = (Number(c.heures_vendues) || 0) - (Number(c.heures_realisees) || 0)
      if (reste > 0) aProduire += reste
      else if (reste < 0) depassements.push({ num: c.num, ecart: Math.round(reste) })
    }
    const reserveSem = capTotale ? aProduire / capTotale : 0
    const pct = capTotale ? Math.round((aProduire / capTotale) * 100) : 0
    return { nbFab, nbEtude, capFab, capEtude, capTotale, aProduire, depassements, reserveSem, pct }
  }, [employes, chantiers])

  function changePeriodMode(mode) {
    setPeriodMode(mode)
    setPeriodOffset(0)
  }
  function changeViewMode(mode) {
    setViewMode(mode)
    setSearch('')
  }

  // Jours affichés selon le mode. Semaine = 7 j, 3 semaines = 21 j (on glisse
  // par semaine avec préc./suiv.), Mois = le mois entier.
  const days = useMemo(() => {
    const today = new Date()
    if (periodMode === 'sem' || periodMode === '3sem') {
      const nb = periodMode === '3sem' ? 21 : 7
      const monday = new Date(today)
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + periodOffset * 7)
      monday.setHours(0, 0, 0, 0)
      return Array.from({ length: nb }, (_, i) => {
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
    periodMode === 'mois'
      ? days[0].toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : `${ddmm(days[0])} – ${ddmm(days[days.length - 1])}`

  const todayIso = isoDay(new Date())
  // Vue compacte (colonnes étroites) dès qu'on dépasse la semaine.
  const isMonth = periodMode === 'mois' || periodMode === '3sem'

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
        // `startIso` = premier jour visible du bloc : sert de date par défaut
        // quand on ajoute un autre chantier sur ce même jour.
        cells.push({ type: 'aff', aff, span, key: aff.id, startIso: iso })
        di += span
      } else {
        cells.push({ type: 'empty', key: 'e' + di, day: days[di] })
        di += 1
      }
    }
    return cells
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

      {charge.capTotale > 0 && (
        <div className="charge-bar">
          <div className="charge-head">
            <span className="charge-title">Charge d’équipe</span>
            <span className="charge-badge">⚗ En test — chiffres indicatifs</span>
          </div>
          <div className="charge-main">
            <div className="charge-fig">
              <span className="charge-val">{charge.aProduire} h</span>
              <span className="charge-lbl">à produire</span>
            </div>
            <div className="charge-track" title={`${charge.pct}% de la capacité hebdo`}>
              <span
                className={
                  'charge-fill' +
                  (charge.pct >= 100 ? ' charge-fill--crit' : charge.pct >= 80 ? ' charge-fill--warn' : '')
                }
                style={{ width: Math.min(100, charge.pct) + '%' }}
              />
            </div>
            <div className="charge-fig">
              <span className="charge-val">
                {charge.reserveSem.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} sem.
              </span>
              <span className="charge-lbl">de réserve</span>
            </div>
          </div>

          <div className="charge-pools">
            <span className="charge-pool">
              <i style={{ background: PHASE_COLOR.fabrication }} />
              Fabrication · <strong>{charge.capFab} h</strong>/sem ({charge.nbFab} menuisiers)
            </span>
            <span className="charge-pool">
              <i style={{ background: PHASE_COLOR.etude }} />
              Étude · <strong>{charge.capEtude} h</strong>/sem ({charge.nbEtude} BE/prog)
            </span>
            {charge.depassements.length > 0 && (
              <span className="charge-warn">
                ⚠ {charge.depassements.map((d) => `${d.num} (${d.ecart} h)`).join(' · ')} en dépassement
              </span>
            )}
          </div>

          <div className="charge-note">
            Capacité sur base 39 h/sem, hors absences · demande = heures vendues −
            réalisées, non ventilée par famille (v1).
          </div>
        </div>
      )}

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
          <button className={'vt' + (periodMode === 'sem' ? ' vt--on' : '')} onClick={() => changePeriodMode('sem')}>1 semaine</button>
          <button className={'vt' + (periodMode === '3sem' ? ' vt--on' : '')} onClick={() => changePeriodMode('3sem')}>3 semaines</button>
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
          {PHASES.map((p) => (
            <div key={p.slug} className="plan-legend-item">
              <span className="plan-legend-dot" style={{ background: p.color }} />
              {p.label}
            </div>
          ))}
          <span className="plan-legend-hint">
            couleur = type de travail · le code identifie le chantier
          </span>
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
                filteredEmployes.map((emp) => {
                  const empAffs = affectations.filter(
                    (a) => a.sal_id === emp.id && a.date_debut && a.date_fin
                  )

                  // Un demi-bloc chantier (matin, après-midi ou journée entière).
                  // `peutJournee` : l'autre moitié du jour est libre → on peut
                  // étendre à la journée d'un clic. `estJournee` : bloc pleine
                  // journée → on peut le réduire au matin.
                  const bloc = (aff, { peutJournee = false, estJournee = false } = {}) => {
                    const ch = chantiers.find((c) => c.id === aff.chantier_id)
                    const col = PHASE_COLOR[aff.phase] ?? COULEUR_DEFAUT
                    const phase = aff.phase ? resolve(PHASE_PLANNING, aff.phase).label : ''
                    // On montre l'ouvrage quand il est précisé, sinon le métier.
                    const sousTitre = aff.ouvrage?.nom || phase
                    return (
                      <div
                        className="plan-hblock"
                        draggable
                        onDragStart={(e) => onDragStartBlock(e, aff)}
                        onClick={() => setEditAff(aff)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setMenu({ aff, x: e.clientX, y: e.clientY })
                        }}
                        title={`${ch?.num ?? '?'}${ch?.client ? ' · ' + ch.client : ''}${aff.ouvrage?.nom ? ' · ' + aff.ouvrage.nom : ''}${phase ? ' · ' + phase : ''}\nCliquer pour modifier · clic droit pour supprimer`}
                        style={{ background: col + '22', borderLeft: `3px solid ${col}` }}
                      >
                        <span className="plan-hblock-num">{ch?.num ?? '?'}</span>
                        {sousTitre && <span className="plan-hblock-k">{sousTitre}</span>}
                        {peutJournee && (
                          <button
                            className="plan-hblock-day"
                            title="Étendre à la journée entière"
                            aria-label="Étendre à la journée entière"
                            onClick={(e) => {
                              e.stopPropagation()
                              changerCreneau(aff, 'journee')
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            ▾
                          </button>
                        )}
                        {estJournee && (
                          <button
                            className="plan-hblock-day plan-hblock-day--up"
                            title="Réduire au matin"
                            aria-label="Réduire au matin"
                            onClick={(e) => {
                              e.stopPropagation()
                              changerCreneau(aff, 'matin')
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            ▴
                          </button>
                        )}
                        <span
                          className="plan-hblock-resize"
                          title="Étirer sur plusieurs jours"
                          onMouseDown={(e) => onResizeStart(e, aff)}
                          onClick={(e) => e.stopPropagation()}
                          onDragStart={(e) => e.stopPropagation()}
                        >
                          ⟩
                        </span>
                      </div>
                    )
                  }

                  // Moitié libre d'une journée déjà entamée : ajout d'un demi-créneau
                  // (le cas optionnel, quand l'autre moitié est occupée).
                  const vide = (iso, moitie) => (
                    <div
                      className="plan-half plan-half--empty"
                      title={`Affecter — ${CRENEAUX[moitie].label.toLowerCase()}`}
                      onClick={() => setNewAff({ salId: emp.id, date: iso, creneau: moitie })}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onDropCell(emp, iso, moitie)}
                    />
                  )

                  // Journée entière vide : cible par défaut. Cliquer = 1 jour,
                  // glisser sur plusieurs jours = affectation directe sur la plage.
                  const videJournee = (iso) => (
                    <div
                      className={
                        'plan-full plan-half--empty' +
                        (dansSel(emp.id, iso) ? ' plan-cell--sel' : '')
                      }
                      title="Affecter la journée · glisser pour plusieurs jours"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        selStart(emp.id, iso)
                      }}
                      onMouseEnter={() => selOver(emp.id, iso)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onDropCell(emp, iso, 'journee')}
                    />
                  )

                  return (
                    <tr key={emp.id}>
                      <td className="plan-emp">
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
                      {days.map((day) => {
                        const iso = isoDay(day)
                        const we = day.getDay() === 0 || day.getDay() === 6
                        const isT = iso === todayIso
                        const am = affDuJour(empAffs, iso, 'matin')
                        const pm = affDuJour(empAffs, iso, 'apres')
                        const journee = am && pm && am.id === pm.id
                        const cls =
                          'plan-cell plan-cell--hd' +
                          (isT ? ' plan-cell--today' : we ? ' plan-cell--we' : '')
                        return (
                          <td key={iso} className={cls}>
                            <div className="plan-hd">
                              {journee ? (
                                <div className="plan-full">{bloc(am, { estJournee: true })}</div>
                              ) : am || pm ? (
                                <>
                                  {am ? (
                                    <div className="plan-half">{bloc(am, { peutJournee: !pm })}</div>
                                  ) : (
                                    vide(iso, 'matin')
                                  )}
                                  {pm ? (
                                    <div className="plan-half">{bloc(pm, { peutJournee: !am })}</div>
                                  ) : (
                                    vide(iso, 'apres')
                                  )}
                                </>
                              ) : (
                                videJournee(iso)
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
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
          initialDateFin={newAff.dateFin}
          initialCreneau={newAff.creneau}
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
          {(() => {
            // Options de créneau selon l'état courant : étendre à la journée
            // depuis une demi-journée, ou réduire depuis une journée entière.
            const cr = creneauDe(menu.aff?.heure_debut, menu.aff?.heure_fin)
            const item = (label, creneau) => (
              <button
                key={creneau}
                className="ctx-menu-item"
                onClick={() => {
                  setMenu(null)
                  changerCreneau(menu.aff, creneau)
                }}
              >
                {label}
              </button>
            )
            if (cr === 'journee')
              return [
                item('◐ Réduire au matin', 'matin'),
                item('◑ Réduire à l’après-midi', 'apres'),
              ]
            if (cr === 'matin')
              return [
                item('⤢ Étendre à la journée', 'journee'),
                item('◑ Basculer en après-midi', 'apres'),
              ]
            return [
              item('⤢ Étendre à la journée', 'journee'),
              item('◐ Basculer en matin', 'matin'),
            ]
          })()}
          {menu.salId && (
            <button
              className="ctx-menu-item"
              onClick={() => {
                setMenu(null)
                setNewAff({ salId: menu.salId, date: menu.date })
              }}
            >
              ➕ Ajouter un chantier ce jour-là
            </button>
          )}
          <button className="ctx-menu-item" onClick={() => deleteAff(menu.aff)}>
            🗑 Supprimer l’affectation
          </button>
        </div>
      )}
    </section>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store'
import { formatDate } from '../lib/format'

const DONE = ['termine', 'facture']

// État d'un chantier dérivé de ses ouvrages.
function chantierFlags(c) {
  const statuts = (c.ouvrages ?? []).map((o) => o.statut)
  const total = statuts.length
  const isTermine = total > 0 && statuts.every((s) => DONE.includes(s))
  const hasEnCours = statuts.some((s) => !DONE.includes(s))
  const hasAFacturer = statuts.some((s) => s === 'termine')
  return { total, isTermine, hasEnCours, hasAFacturer }
}

const FILTERS = [
  { id: 'tous', label: 'Tous', test: () => true },
  { id: 'encours', label: 'En cours', test: (f) => !f.isTermine && f.hasEnCours },
  { id: 'actifs', label: 'Actifs', test: (f) => !f.isTermine },
  { id: 'afacturer', label: 'À facturer', test: (f) => !f.isTermine && f.hasAFacturer },
  { id: 'termines', label: 'Terminés', test: (f) => f.isTermine },
]

export default function Chantiers() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [chantiers, setChantiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tous')
  const [sortDir, setSortDir] = useState('desc') // 'desc' = plus récent en haut

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      let query = supabase
        .from('chantiers')
        .select(
          'id, num, ca_id, client, nom, dep_approx, avec_pose, created_at, ' +
            'ca:utilisateurs!ca_id(prenom, nom), ' +
            'ouvrages(statut)'
        )
        .order('num', { ascending: true })
      // Le Chargé d'affaire ne voit que ses chantiers.
      if (user?.role === 'ca' && user?.id) query = query.eq('ca_id', user.id)
      const { data, error: dbError } = await query
      if (!active) return
      if (dbError) {
        setError(dbError.message)
        setChantiers([])
      } else {
        setChantiers(data ?? [])
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const counts = useMemo(() => {
    const c = {}
    for (const f of FILTERS) {
      c[f.id] = chantiers.filter((ch) => f.test(chantierFlags(ch))).length
    }
    return c
  }, [chantiers])

  // Numéro trié sur les 3 premiers chiffres du code (ex : "228-LEFEBVRE" → 228).
  function numKey(c) {
    const m = String(c.num ?? '').match(/\d{1,3}/)
    return m ? parseInt(m[0], 10) : -1
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const activeFilter = FILTERS.find((f) => f.id === filter) ?? FILTERS[0]
    return chantiers
      .filter((c) => {
        if (!activeFilter.test(chantierFlags(c))) return false
        if (!q) return true
        return (
          (c.num ?? '').toLowerCase().includes(q) ||
          (c.client ?? '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        // Épingle le chantier STOCK en tête, puis tri par numéro.
        if (a.num === 'STOCK') return -1
        if (b.num === 'STOCK') return 1
        const diff = numKey(a) - numKey(b)
        return sortDir === 'desc' ? -diff : diff
      })
  }, [chantiers, search, filter, sortDir])

  return (
    <section className="page">
      <div className="page-head">
        <h2>Chantiers</h2>
        <span className="page-count">
          {loading ? '' : `${filtered.length} / ${chantiers.length}`}
        </span>
      </div>

      {!loading && !error && (
        <>
          <div className="chantiers-toolbar">
            <input
              className="plan-search"
              style={{ width: 260, marginBottom: 0 }}
              placeholder="🔍 Rechercher (n° ou client)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className="btn bg bsm"
              onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
              title="Trier par numéro de chantier"
            >
              {sortDir === 'desc' ? '↓ Décroissant' : '↑ Croissant'}
            </button>
          </div>
          <div className="course-filters">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className="btn bg bsm"
                style={
                  filter === f.id
                    ? { background: 'var(--acier)', color: '#fff', borderColor: 'var(--acier)' }
                    : undefined
                }
                onClick={() => setFilter(f.id)}
              >
                {f.label} <span className="filter-count">{counts[f.id] ?? 0}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {loading && <p className="muted">Chargement…</p>}

      {error && (
        <div className="alert">
          <strong>Erreur de chargement :</strong> {error}
        </div>
      )}

      {!loading && !error && chantiers.length === 0 && (
        <p className="muted">Aucun chantier pour le moment.</p>
      )}

      {!loading && !error && chantiers.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Nom</th>
                <th>Client</th>
                <th>Chargé d'affaires</th>
                <th>Départ approx.</th>
                <th>Pose</th>
                <th className="num">Ouvrages</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const ca = c.ca
                const nbOuvrages = (c.ouvrages ?? []).length
                const isStock = c.num === 'STOCK'
                return (
                  <tr
                    key={c.id}
                    className={'row-link' + (isStock ? ' row-stock' : '')}
                    onClick={() => navigate(`/chantiers/${c.id}/ouvrages`)}
                  >
                    <td className="mono">{isStock ? '📦 STOCK' : c.num ?? '—'}</td>
                    <td className="strong">{c.nom}</td>
                    <td>{c.client ?? '—'}</td>
                    <td>{ca ? `${ca.prenom} ${ca.nom}` : '—'}</td>
                    <td>{formatDate(c.dep_approx)}</td>
                    <td>
                      <span className={'bdg ' + (c.avec_pose ? 'bdg--yes' : 'bdg--no')}>
                        {c.avec_pose ? 'Avec pose' : 'Sans pose'}
                      </span>
                    </td>
                    <td className="num">{nbOuvrages}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty">
                    Aucun chantier pour ce filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

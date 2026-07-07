import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
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
  const [chantiers, setChantiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tous')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const { data, error: dbError } = await supabase
        .from('chantiers')
        .select(
          'id, num, client, nom, dep_approx, avec_pose, created_at, ' +
            'ca:utilisateurs!ca_id(prenom, nom), ' +
            'ouvrages(statut)'
        )
        .order('num', { ascending: true })
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
      // Épingle le chantier STOCK en tête de liste.
      .sort((a, b) => (a.num === 'STOCK' ? -1 : b.num === 'STOCK' ? 1 : 0))
  }, [chantiers, search, filter])

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
          <input
            className="plan-search"
            style={{ width: 260 }}
            placeholder="🔍 Rechercher (n° ou client)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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

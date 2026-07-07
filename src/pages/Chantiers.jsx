import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'

export default function Chantiers() {
  const navigate = useNavigate()
  const [chantiers, setChantiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
            'ouvrages(count)'
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

  return (
    <section className="page">
      <div className="page-head">
        <h2>Chantiers</h2>
        <span className="page-count">
          {loading ? '' : `${chantiers.length} chantier(s)`}
        </span>
      </div>

      {loading && <p className="muted">Chargement…</p>}

      {error && (
        <div className="alert">
          <strong>Erreur de chargement :</strong> {error}
          <div className="alert-sub">
            Vérifie que <code>schema.sql</code> et <code>seed.sql</code> ont été
            exécutés dans Supabase et que les clés dans <code>.env.local</code>{' '}
            sont correctes.
          </div>
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
              {chantiers.map((c) => {
                const ca = c.ca
                const nbOuvrages = c.ouvrages?.[0]?.count ?? 0
                return (
                  <tr
                    key={c.id}
                    className="row-link"
                    onClick={() => navigate(`/chantiers/${c.id}/ouvrages`)}
                  >
                    <td className="mono">{c.num ?? '—'}</td>
                    <td className="strong">{c.nom}</td>
                    <td>{c.client ?? '—'}</td>
                    <td>{ca ? `${ca.prenom} ${ca.nom}` : '—'}</td>
                    <td>{formatDate(c.dep_approx)}</td>
                    <td>
                      <span
                        className={
                          'bdg ' + (c.avec_pose ? 'bdg--yes' : 'bdg--no')
                        }
                      >
                        {c.avec_pose ? 'Avec pose' : 'Sans pose'}
                      </span>
                    </td>
                    <td className="num">{nbOuvrages}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

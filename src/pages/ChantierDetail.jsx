import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'

const SUBTABS = [
  { to: 'ouvrages', label: 'Ouvrages' },
  { to: 'achats', label: 'Achats' },
  { to: 'fil', label: '💬 Fil' },
  { to: 'reunion', label: '📋 Réunion' },
  { to: 'feedbacks', label: '🔧 Feedbacks' },
]

export default function ChantierDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [chantier, setChantier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const { data, error: dbError } = await supabase
        .from('chantiers')
        .select('*, ca:utilisateurs!ca_id(prenom, nom)')
        .eq('id', id)
        .maybeSingle()
      if (!active) return
      if (dbError) setError(dbError.message)
      else setChantier(data)
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [id])

  const ca = chantier?.ca

  return (
    <section className="page">
      <button className="back-link" onClick={() => navigate('/chantiers')}>
        ← Chantiers
      </button>

      {loading && <p className="muted">Chargement…</p>}
      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}
      {!loading && !error && !chantier && (
        <p className="muted">Chantier introuvable.</p>
      )}

      {chantier && (
        <>
          <div className="detail-head">
            <div>
              <div className="detail-client">{chantier.client ?? '—'}</div>
              <div className="detail-num">
                № {chantier.num ?? '—'}
                {chantier.nom ? ' · ' + chantier.nom : ''}
              </div>
              <div className="detail-pills">
                {ca && (
                  <span className="detail-pill">
                    👤 {ca.prenom} {ca.nom}
                  </span>
                )}
                {chantier.dep_approx && (
                  <span className="detail-pill">
                    📅 Départ approx. : {formatDate(chantier.dep_approx)}
                  </span>
                )}
                {chantier.avec_pose && (
                  <span className="detail-pill">🔧 Avec pose</span>
                )}
              </div>
            </div>
          </div>

          <nav className="subtabs">
            {SUBTABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  'subtab' + (isActive ? ' subtab--active' : '')
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>

          <Outlet context={{ chantier }} />
        </>
      )}
    </section>
  )
}

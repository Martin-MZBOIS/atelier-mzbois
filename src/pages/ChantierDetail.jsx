import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store'
import { formatDate } from '../lib/format'
import ChantierEditModal from './ChantierEditModal'

const SUBTABS = [
  { to: 'ouvrages', label: 'Ouvrages' },
  { to: 'achats', label: 'Achats' },
  { to: 'courses', label: '🚚 Courses' },
  { to: 'fil', label: '💬 Fil' },
  { to: 'reunion', label: '📋 Réunion de chantiers' },
  { to: 'feedbacks', label: '🔧 Feedbacks' },
]

export default function ChantierDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role)
  const subtabs =
    role === 'dir'
      ? [...SUBTABS, { to: 'analytique', label: '📊 Analytique' }]
      : SUBTABS
  const [chantier, setChantier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEdit, setShowEdit] = useState(false)

  const loadChantier = useCallback(async () => {
    const { data, error: dbError } = await supabase
      .from('chantiers')
      .select('*, ca:utilisateurs!ca_id(prenom, nom)')
      .eq('id', id)
      .maybeSingle()
    if (dbError) setError(dbError.message)
    else setChantier(data)
  }, [id])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    loadChantier().finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [loadChantier])

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
            <button className="detail-edit" onClick={() => setShowEdit(true)}>
              ✏ Modifier
            </button>
          </div>

          <nav className="subtabs">
            {subtabs.map((tab) => (
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

          {showEdit && (
            <ChantierEditModal
              chantier={chantier}
              onClose={() => setShowEdit(false)}
              onSaved={async () => {
                setShowEdit(false)
                await loadChantier()
              }}
            />
          )}
        </>
      )}
    </section>
  )
}

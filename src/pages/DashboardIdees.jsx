import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store'
import { formatDate } from '../lib/format'
import SujetModal from './SujetModal'

const SUJET_STATUT = {
  boite: { label: 'En attente', color: '#8a7040' },
  ordre_du_jour: { label: 'Sélectionné', color: '#4a6b8a' },
  traite: { label: 'Traité', color: '#5a7a5a' },
}

// Bloc « Boîte à idées » du tableau de bord (rôles BE et Resp. Prod).
// Permet de soumettre / voir les derniers sujets sans passer par COPIL.
export default function DashboardIdees() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role)

  // Droit de soumettre : Hommes clés = dir/be/prod ; Stratégie = dir seul.
  const canStrategie = role === 'dir'
  const TABS = [
    { id: 'hommes_cles', label: '👥 Hommes clés' },
    ...(canStrategie ? [{ id: 'strategie', label: '📊 Stratégie' }] : []),
  ]

  const [tab, setTab] = useState('hommes_cles')
  const [sujets, setSujets] = useState([])
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)

  async function load() {
    setError('')
    const { data, error: dbError } = await supabase
      .from('copil_sujets')
      .select('id, titre, statut, date, auteur:utilisateurs!soumis_par(prenom, nom)')
      .eq('type', tab)
      .order('date', { ascending: false })
      .limit(3)
    if (dbError) {
      setError(dbError.message)
      setSujets([])
      return
    }
    setSujets(data ?? [])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  return (
    <div className="card dash-full">
      <div className="card-head">
        <span className="card-title">💡 Boîte à idées</span>
        <button className="btn bp bsm" onClick={() => setShowModal(true)}>
          + Soumettre une idée
        </button>
      </div>

      <nav className="subtabs" style={{ marginBottom: 12 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={'subtab' + (tab === t.id ? ' subtab--active' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error ? (
        <div className="empty">
          {/copil_sujets/.test(error)
            ? 'Boîte à idées disponible après la migration 0014.'
            : error}
        </div>
      ) : sujets.length === 0 ? (
        <EmptyState ico="💡" titre="Aucune idée pour l’instant" aide="Toute suggestion d’amélioration est la bienvenue." />
      ) : (
        sujets.map((s) => {
          const st = SUJET_STATUT[s.statut] ?? SUJET_STATUT.boite
          return (
            <div key={s.id} className="copil-sujet">
              <div className="copil-sujet-main">
                <div className="copil-sujet-titre">{s.titre}</div>
                <div className="copil-sujet-meta">
                  {s.auteur ? `${s.auteur.prenom} ${s.auteur.nom}` : '—'} · {formatDate(s.date)}
                </div>
              </div>
              <span className="aspill" style={{ color: st.color, backgroundColor: st.color + '22' }}>
                {st.label}
              </span>
            </div>
          )
        })
      )}

      <button className="link-btn" onClick={() => navigate(`/copil?o=${tab}`)}>
        Voir tout →
      </button>

      {showModal && (
        <SujetModal
          type={tab}
          onClose={() => setShowModal(false)}
          onSaved={async () => {
            setShowModal(false)
            await load()
          }}
        />
      )}
    </div>
  )
}

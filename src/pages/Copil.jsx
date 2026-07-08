import { useState } from 'react'
import CopilChantiers from './CopilChantiers'

const SUBTABS = [
  { id: 'chantiers', label: '🏗 Réunion de chantiers' },
  { id: 'hommes_cles', label: '👥 Hommes clés' },
  { id: 'strategie', label: '📊 Stratégie' },
]

export default function Copil() {
  const [tab, setTab] = useState('chantiers')

  return (
    <section className="page">
      <div className="page-head">
        <h2>COPIL</h2>
      </div>

      <nav className="subtabs">
        {SUBTABS.map((t) => (
          <button
            key={t.id}
            className={'subtab' + (tab === t.id ? ' subtab--active' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'chantiers' && <CopilChantiers />}
      {tab === 'hommes_cles' && (
        <div className="empty">Onglet « Hommes clés » — à venir.</div>
      )}
      {tab === 'strategie' && (
        <div className="empty">Onglet « Stratégie » — à venir.</div>
      )}
    </section>
  )
}

import { useState } from 'react'
import CopilChantiers from './CopilChantiers'
import CopilMeeting from './CopilMeeting'
import { nextHommesCles } from '../lib/copil'

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
        <CopilMeeting
          type="hommes_cles"
          freqLabel="1er jeudi du mois à 11h. Sujets : organisation, process, RH, amélioration continue (pas les chantiers)."
          nextDate={nextHommesCles}
          canSubmit={(role) => ['dir', 'be', 'prod'].includes(role)}
        />
      )}
      {tab === 'strategie' && (
        <div className="empty">Onglet « Stratégie » — à venir.</div>
      )}
    </section>
  )
}

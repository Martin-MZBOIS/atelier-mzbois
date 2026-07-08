import { useState } from 'react'
import CopilChantiers from './CopilChantiers'
import CopilMeeting from './CopilMeeting'
import { nextHommesCles, nextStrategie } from '../lib/copil'

const STRATEGIE_TEMPLATE = [
  'Bilan des 6 derniers mois',
  'Objectifs CA / marge / marchés',
  'Nouveaux clients à cibler',
  'Priorités et décisions stratégiques',
  'Notes libres',
]

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
        <CopilMeeting
          type="strategie"
          freqLabel="Septembre et Mars de chaque année. Prise de recul, vision long terme (>1 an) : CA/marge/marchés/nouveaux clients, décisions stratégiques."
          nextDate={nextStrategie}
          canSubmit={(role) => role === 'dir'}
          odjTemplate={STRATEGIE_TEMPLATE}
        />
      )}
    </section>
  )
}

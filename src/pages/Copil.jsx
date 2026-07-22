import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CopilChantiers from './CopilChantiers'
import CopilMeeting from './CopilMeeting'
import { nextHommesCles, nextStrategie } from '../lib/copil'
import { GEL } from '../lib/gel'

const STRATEGIE_TEMPLATE = [
  'Bilan des 6 derniers mois',
  'Objectifs CA / marge / marchés',
  'Nouveaux clients à cibler',
  'Priorités et décisions stratégiques',
  'Notes libres',
]

// Les réunions de pilotage sont gelées (voir lib/gel.js) : on retire leurs
// onglets, et une URL ?o=hommes_cles saisie à la main retombe sur la réunion
// de chantiers plutôt que sur une page vide.
const SUBTABS = [
  { id: 'chantiers', label: '🏗 Réunion de chantiers' },
  ...(GEL.copilPilotage
    ? []
    : [
        { id: 'hommes_cles', label: '👥 Hommes clés' },
        { id: 'strategie', label: '📊 Stratégie' },
      ]),
]

const VALID_TABS = SUBTABS.map((t) => t.id)

export default function Copil() {
  const [params, setParams] = useSearchParams()
  const urlTab = params.get('o')
  const [tab, setTab] = useState(VALID_TABS.includes(urlTab) ? urlTab : 'chantiers')

  // Synchronise l'onglet actif avec le paramètre ?o= (navigation depuis la sidebar).
  useEffect(() => {
    if (VALID_TABS.includes(urlTab) && urlTab !== tab) setTab(urlTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab])

  function selectTab(id) {
    setTab(id)
    setParams({ o: id }, { replace: true })
  }

  return (
    <section className="page">
      <div className="page-head">
        <h2>{SUBTABS.length > 1 ? 'COPIL' : 'Réunion de chantiers'}</h2>
      </div>

      {/* Une barre d'onglets pour un seul onglet n'apprend rien. On ne la rend
          pas du tout : `hidden` serait neutralisé par le display:flex de
          .subtabs. */}
      {SUBTABS.length > 1 && (
      <nav className="subtabs">
        {SUBTABS.map((t) => (
          <button
            key={t.id}
            className={'subtab' + (tab === t.id ? ' subtab--active' : '')}
            onClick={() => selectTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      )}

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

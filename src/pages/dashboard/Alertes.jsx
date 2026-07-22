// Bloc d'alertes du tableau de bord.
//
// Une ALERTE signale une action à faire : elle est toujours visible et
// disparaît d'elle-même quand l'action est faite (elle est recalculée depuis
// les données). À ne pas confondre avec les NOTIFICATIONS (cloche de la
// sidebar), qui informent d'un évènement sans forcément appeler une action.
//
// Les alertes sont regroupées sous un titre unique plutôt que listées à plat :
// on lit d'abord « combien », puis le détail.
//
// items : [{ ico, txt, tone: 'rouge' | 'orange', onClick }]
export default function Alertes({ items = [] }) {
  if (items.length === 0) return null
  const n = items.length
  return (
    <section className="dash-alerts" aria-label="Alertes">
      <h2 className="dash-alerts-title">
        {n} point{n > 1 ? 's' : ''} demande{n > 1 ? 'nt' : ''} votre attention
      </h2>
      {items.map((a, i) => (
        <button
          key={i}
          className={'dash-alert' + (a.tone === 'orange' ? ' dash-alert--orange' : '')}
          onClick={a.onClick}
          disabled={!a.onClick}
        >
          <span className="dash-alert-ico">{a.ico}</span>
          <span className="dash-alert-txt">{a.txt}</span>
          {a.onClick && <span className="dash-alert-arrow">→</span>}
        </button>
      ))}
    </section>
  )
}

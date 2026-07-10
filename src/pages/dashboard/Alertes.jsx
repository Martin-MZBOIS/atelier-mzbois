// Bloc d'alertes du tableau de bord.
//
// Une ALERTE signale une action à faire : elle est toujours visible et
// disparaît d'elle-même quand l'action est faite (elle est recalculée depuis
// les données). À ne pas confondre avec les NOTIFICATIONS (cloche de la
// sidebar), qui informent d'un évènement sans forcément appeler une action.
//
// items : [{ ico, txt, tone: 'rouge' | 'orange', onClick }]
export default function Alertes({ items = [] }) {
  if (items.length === 0) return null
  return (
    <div className="dash-alerts">
      {items.map((a, i) => (
        <div
          key={i}
          className={'dash-alert' + (a.tone === 'orange' ? ' dash-alert--orange' : '')}
          onClick={a.onClick}
        >
          {a.ico} <span>{a.txt}</span>
          <span className="dash-alert-arrow">→</span>
        </div>
      ))}
    </div>
  )
}

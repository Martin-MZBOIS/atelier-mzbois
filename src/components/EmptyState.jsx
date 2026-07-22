// État vide : une absence de données n'est pas une impasse.
// On dit ce qui manque, pourquoi, et on propose l'action qui remplit l'écran.
//
// ico     : pictogramme (facultatif)
// titre   : la phrase principale
// aide    : précision facultative
// action  : { label, onClick } — le bouton qui débloque la situation
export default function EmptyState({ ico = '—', titre, aide, action, className = '' }) {
  return (
    <div className={'empty-state' + (className ? ' ' + className : '')}>
      <div className="empty-state-ico" aria-hidden="true">{ico}</div>
      <div className="empty-state-txt">{titre}</div>
      {aide && <div className="empty-state-aide">{aide}</div>}
      {action && (
        <button className="btn bp bsm" onClick={action.onClick} style={{ marginTop: 10 }}>
          {action.label}
        </button>
      )}
    </div>
  )
}

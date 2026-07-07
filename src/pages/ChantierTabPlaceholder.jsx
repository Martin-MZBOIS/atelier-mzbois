// Sous-onglet de fiche chantier pas encore migré depuis la maquette.
export default function ChantierTabPlaceholder({ title }) {
  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">{title}</span>
      </div>
      <div className="empty">Onglet « {title} » à migrer prochainement.</div>
    </div>
  )
}

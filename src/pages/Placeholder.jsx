// Page temporaire pour les onglets pas encore migrés depuis la maquette.
export default function Placeholder({ title }) {
  return (
    <section className="page">
      <div className="page-head">
        <h2>{title}</h2>
      </div>
      <p className="muted">Onglet à migrer prochainement.</p>
    </section>
  )
}

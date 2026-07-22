// Squelettes de chargement : des blocs qui préfigurent la mise en page, à la
// place d'un « Chargement… » suivi d'une apparition brutale. L'attente paraît
// plus courte parce que la structure est déjà là.

// Une ligne de texte grisée. `w` : largeur CSS (ex. '60%').
export function SkelLine({ w = '100%', h = 13 }) {
  return <span className="skel" style={{ width: w, height: h }} />
}

// Liste de lignes (tâches, achats, messages…).
export function SkelList({ rows = 4 }) {
  return (
    <div className="skel-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skel-row">
          <SkelLine w="62%" />
          <SkelLine w="34%" h={10} />
        </div>
      ))}
    </div>
  )
}

// Carte complète (titre + quelques lignes).
export function SkelCard({ rows = 3 }) {
  return (
    <div className="card" aria-hidden="true">
      <div className="skel-head">
        <SkelLine w="38%" h={14} />
      </div>
      <SkelList rows={rows} />
    </div>
  )
}

// Tableau en attente : on reprend la grille de colonnes pour que les vraies
// lignes se substituent aux blocs sans décaler la mise en page.
export function SkelTable({ rows = 6, cols = 5 }) {
  return (
    <div className="table-wrap skel-table" aria-hidden="true">
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="skel-trow"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }, (_, c) => (
            <SkelLine key={c} w={c === 0 ? '72%' : '50%'} />
          ))}
        </div>
      ))}
    </div>
  )
}

// Écran de chargement d'une page : en-tête + grille de cartes.
export function SkelPage({ cards = 2, rows = 3 }) {
  return (
    <div className="skel-page" role="status" aria-label="Chargement en cours">
      <div className="skel-head">
        <SkelLine w="220px" h={24} />
        <SkelLine w="140px" h={11} />
      </div>
      <div className="dash-grid">
        {Array.from({ length: cards }, (_, i) => (
          <SkelCard key={i} rows={rows} />
        ))}
      </div>
    </div>
  )
}

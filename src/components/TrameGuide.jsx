import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_TRAMES } from '../lib/copil'

// Affiche la trame d'une réunion (guide). Charge la trame paramétrée dans
// copil_trames (migration 0024) si disponible, sinon la trame par défaut.
export default function TrameGuide({ type, title = 'Trame de réunion' }) {
  const [sections, setSections] = useState(DEFAULT_TRAMES[type] ?? [])

  useEffect(() => {
    let active = true
    setSections(DEFAULT_TRAMES[type] ?? [])
    supabase
      .from('copil_trames')
      .select('sections')
      .eq('type', type)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.sections?.length) setSections(data.sections)
      })
    return () => {
      active = false
    }
  }, [type])

  if (!sections.length) return null
  return (
    <div className="trame-guide">
      <div className="sl">{title}</div>
      <ol className="trame-list">
        {sections.map((s, i) => (
          <li key={i}>
            <span className="trame-titre">{s.titre}</span>
            {Array.isArray(s.points) && s.points.length > 0 && (
              <ul className="trame-points">
                {s.points.map((p, j) => (
                  <li key={j}>{p}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

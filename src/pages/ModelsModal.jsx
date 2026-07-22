import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { SkelList } from '../components/Skeleton'
import { supabase } from '../lib/supabase'
import { TYP_ACHAT, resolve } from '../lib/statuts'

// Liste les ouvrages modèles ; onApply(model) crée un ouvrage depuis le modèle.
export default function ModelsModal({ onApply, onClose }) {
  const [modeles, setModeles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    supabase
      .from('ouvrage_modeles')
      .select('id, nom, description, typs')
      .order('nom')
      .then(({ data }) => {
        if (active) {
          setModeles(data ?? [])
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  const q = search.trim().toLowerCase()
  const filtered = q
    ? modeles.filter(
        (m) =>
          m.nom.toLowerCase().includes(q) ||
          (m.description ?? '').toLowerCase().includes(q)
      )
    : modeles

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="modal-title">Ouvrages modèles</div>

        <input
          className="plan-search"
          style={{ width: '100%', marginBottom: 10 }}
          placeholder="🔍 Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <SkelList rows={4} />
        ) : filtered.length === 0 ? (
          <EmptyState ico="📐" titre="Aucun modèle" aide="Créez des modèles dans la bibliothèque pour les réutiliser ici." />
        ) : (
          filtered.map((m) => (
            <div
              key={m.id}
              className="model-pick"
              onClick={() => onApply(m)}
            >
              <div className="model-pick-nom">⭐ {m.nom}</div>
              {m.description && (
                <div className="model-pick-desc">{m.description}</div>
              )}
              <div className="modele-typs">
                {(m.typs ?? []).map((slug) => {
                  const t = resolve(TYP_ACHAT, slug)
                  return (
                    <span key={slug} className={'typbdg ' + (t.cls ?? 'typ-div')}>
                      {t.label}
                    </span>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

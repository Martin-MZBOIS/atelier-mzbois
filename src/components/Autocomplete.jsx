import { useEffect, useMemo, useRef, useState } from 'react'

// Champ autocomplete réutilisable avec navigation clavier (↑ ↓ Entrée Échap).
// - items : tableau d'objets
// - getLabel(item) : texte affiché / recherché
// - getKey(item) : clé unique
// - getSub(item) : (optionnel) sous-texte affiché en gris
// - value : item sélectionné (objet) ou null
// - onSelect(item | null) : callback de sélection
export default function Autocomplete({
  items,
  value = null,
  onSelect,
  getLabel = (i) => i?.label ?? '',
  getKey = (i) => i?.id,
  getSub = null,
  placeholder = '',
  autoFocus = false,
  allowClear = true,
}) {
  const [query, setQuery] = useState(value ? getLabel(value) : '')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const boxRef = useRef(null)
  const listRef = useRef(null)

  // Resynchronise le texte quand la valeur externe change (édition, reset).
  useEffect(() => {
    setQuery(value ? getLabel(value) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => getLabel(it).toLowerCase().includes(q))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query])

  // Ferme la liste au clic extérieur.
  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (hi >= filtered.length) setHi(Math.max(0, filtered.length - 1))
  }, [filtered, hi])

  function choose(item) {
    onSelect?.(item)
    setQuery(item ? getLabel(item) : '')
    setOpen(false)
  }

  function onKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHi((h) => Math.min(filtered.length - 1, h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHi((h) => Math.max(0, h - 1))
    } else if (e.key === 'Enter') {
      if (open && filtered[hi]) {
        e.preventDefault()
        choose(filtered[hi])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Fait défiler l'élément surligné dans la vue.
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.children[hi]
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [hi, open])

  return (
    <div className="autocomplete" ref={boxRef}>
      <input
        value={query}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHi(0)
          if (allowClear && value) onSelect?.(null)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && filtered.length > 0 && (
        <div className="autocomplete-list" ref={listRef}>
          {filtered.map((it, i) => (
            <div
              key={getKey(it)}
              className={'autocomplete-item' + (i === hi ? ' autocomplete-item--hi' : '')}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(it)
              }}
            >
              <span>{getLabel(it)}</span>
              {getSub && getSub(it) && (
                <span className="autocomplete-sub"> · {getSub(it)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useId, useMemo, useRef, useState } from 'react'

// Menu déroulant saisissable — remplace un <select> natif.
//
// On tape pour filtrer, ↑ ↓ pour parcourir, Entrée pour valider, Échap pour
// annuler, ou on clique. Tout se fait au clavier sans lâcher les mains.
//
// API volontairement proche de <select> pour un remplacement direct :
//   <SelectSearch value={x} onChange={(v) => …} options={[{ value, label }]} />
//
// - options    : [{ value, label, sub? }] — `sub` s'affiche en gris à droite
// - allowEmpty : propose une option « aucune valeur » en tête de liste
// - emptyLabel : libellé de cette option (défaut « — »)
export default function SelectSearch({
  value,
  onChange,
  options = [],
  placeholder = '',
  allowEmpty = false,
  emptyLabel = '—',
  disabled = false,
  autoFocus = false,
  className = '',
  title,
}) {
  const listeId = useId()
  const boxRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const [ouvert, setOuvert] = useState(false)
  const [saisie, setSaisie] = useState('')
  const [hi, setHi] = useState(0)

  // Toutes les options, y compris « aucune valeur » si demandé.
  const toutes = useMemo(
    () => (allowEmpty ? [{ value: '', label: emptyLabel }, ...options] : options),
    [options, allowEmpty, emptyLabel]
  )

  const choisie = toutes.find((o) => String(o.value) === String(value ?? ''))
  const libelleChoisi = choisie?.label ?? ''

  // Hors édition, le champ affiche la valeur sélectionnée.
  const texte = ouvert ? saisie : libelleChoisi

  const filtrees = useMemo(() => {
    const q = saisie.trim().toLowerCase()
    if (!ouvert || !q) return toutes
    return toutes.filter((o) => (o.label ?? '').toLowerCase().includes(q))
  }, [toutes, saisie, ouvert])

  function ouvrir() {
    if (disabled) return
    setSaisie('')
    setOuvert(true)
    // Positionne le surlignage sur la valeur courante.
    const i = toutes.findIndex((o) => String(o.value) === String(value ?? ''))
    setHi(i < 0 ? 0 : i)
  }

  function fermer() {
    setOuvert(false)
    setSaisie('')
  }

  function choisir(opt) {
    onChange?.(opt.value)
    fermer()
  }

  useEffect(() => {
    if (hi >= filtrees.length) setHi(Math.max(0, filtrees.length - 1))
  }, [filtrees, hi])

  // Fait défiler l'option surlignée dans la vue.
  useEffect(() => {
    if (!ouvert || !listRef.current) return
    listRef.current.children[hi]?.scrollIntoView({ block: 'nearest' })
  }, [hi, ouvert])

  // Ferme au clic extérieur.
  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) fermer()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function onKeyDown(e) {
    if (disabled) return

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!ouvert) return ouvrir()
      setHi((h) =>
        e.key === 'ArrowDown'
          ? Math.min(filtrees.length - 1, h + 1)
          : Math.max(0, h - 1)
      )
      return
    }

    if (e.key === 'Enter') {
      if (!ouvert) return // laisse le formulaire se valider
      e.preventDefault()
      // La liste est ouverte : Entrée choisit ici et ne doit pas remonter
      // valider le formulaire de la fenêtre.
      e.stopPropagation()
      if (filtrees[hi]) choisir(filtrees[hi])
      else fermer()
      return
    }

    if (e.key === 'Escape') {
      if (!ouvert) return // laisse la fenêtre se fermer
      e.preventDefault()
      e.stopPropagation()
      fermer()
      return
    }

    if (e.key === 'Tab') fermer()
  }

  return (
    <div
      className={'selsearch' + (className ? ' ' + className : '')}
      ref={boxRef}
      title={title}
    >
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={ouvert}
        aria-controls={listeId}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        autoFocus={autoFocus}
        value={texte}
        placeholder={placeholder || emptyLabel}
        onChange={(e) => {
          setSaisie(e.target.value)
          setOuvert(true)
          setHi(0)
        }}
        onFocus={ouvrir}
        onClick={ouvrir}
        onBlur={() => {
          // Ne jamais laisser une saisie partielle : on revient à la valeur.
          setTimeout(fermer, 0)
        }}
        onKeyDown={onKeyDown}
      />
      <span className="selsearch-chevron" aria-hidden="true">▾</span>

      {ouvert && (
        <ul className="selsearch-list" id={listeId} role="listbox" ref={listRef}>
          {filtrees.length === 0 && (
            <li className="selsearch-vide">Aucun résultat</li>
          )}
          {filtrees.map((o, i) => (
            <li
              key={String(o.value)}
              role="option"
              aria-selected={String(o.value) === String(value ?? '')}
              className={
                'selsearch-item' +
                (i === hi ? ' selsearch-item--hi' : '') +
                (String(o.value) === String(value ?? '') ? ' selsearch-item--on' : '')
              }
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => {
                // mousedown plutôt que click : on choisit avant le blur.
                e.preventDefault()
                choisir(o)
              }}
            >
              <span className="selsearch-lbl">{o.label}</span>
              {o.sub && <span className="selsearch-sub">{o.sub}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Icon from './Icon'

// Recherche globale (sidebar) : interroge en direct chantiers, achats,
// contacts, articles et courses dès 2 caractères. Ctrl+K met le focus.
export default function GlobalSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  // Raccourci clavier Ctrl+K / Cmd+K → focus sur la recherche.
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Ferme les résultats au clic en dehors.
  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Recherche en temps réel (debounce) dès 2 caractères.
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setResults(null)
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    const t = setTimeout(async () => {
      // Neutralise les caractères qui casseraient le filtre `.or()`.
      const safe = term.replace(/[,()%]/g, ' ')
      const like = `%${safe}%`
      const [ch, ac, fo, em, ar, co] = await Promise.all([
        supabase
          .from('chantiers')
          .select('id, num, client, nom')
          .or(`num.ilike.${like},client.ilike.${like},nom.ilike.${like}`)
          .limit(6),
        supabase
          .from('achats')
          .select('id, nom, ref, chantier_id, chantier:chantiers!chantier_id(num)')
          .or(`nom.ilike.${like},ref.ilike.${like}`)
          .limit(6),
        supabase.from('fournisseurs').select('id, nom, type').ilike('nom', like).limit(6),
        supabase
          .from('employes')
          .select('id, prenom, nom, role')
          .or(`prenom.ilike.${like},nom.ilike.${like}`)
          .limit(6),
        supabase.from('articles').select('id, nom').ilike('nom', like).limit(6),
        supabase
          .from('courses')
          .select('id, quoi, chantier_id, chantier:chantiers!chantier_id(num)')
          .ilike('quoi', like)
          .limit(6),
      ])
      if (!active) return
      setResults({
        chantiers: ch.data ?? [],
        achats: ac.data ?? [],
        contacts: [
          ...(fo.data ?? []).map((f) => ({ kind: 'f', id: f.id, label: f.nom, sub: f.type })),
          ...(em.data ?? []).map((e) => ({
            kind: 'e',
            id: e.id,
            label: `${e.prenom} ${e.nom}`,
            sub: e.role,
          })),
        ],
        articles: ar.data ?? [],
        courses: co.data ?? [],
      })
      setLoading(false)
      setOpen(true)
    }, 250)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [q])

  function go(path) {
    setOpen(false)
    setQ('')
    setResults(null)
    navigate(path)
  }

  const groups = results
    ? [
        {
          key: 'chantiers',
          label: 'Chantiers',
          icon: 'building',
          items: results.chantiers.map((c) => ({
            id: c.id,
            label: c.num || c.nom,
            sub: c.client,
            path: `/chantiers/${c.id}/ouvrages`,
          })),
        },
        {
          key: 'achats',
          label: 'Achats',
          icon: 'cart',
          items: results.achats.map((a) => ({
            id: a.id,
            label: a.nom || a.ref,
            sub: a.chantier?.num,
            path: a.chantier_id ? `/chantiers/${a.chantier_id}/achats` : '/achats',
          })),
        },
        {
          key: 'contacts',
          label: 'Contacts',
          icon: 'contact',
          items: results.contacts.map((c) => ({
            id: c.kind + c.id,
            label: c.label,
            sub: c.sub,
            path: '/contacts',
          })),
        },
        {
          key: 'articles',
          label: 'Articles',
          icon: 'book',
          items: results.articles.map((a) => ({
            id: a.id,
            label: a.nom,
            path: '/bibliotheque',
          })),
        },
        {
          key: 'courses',
          label: 'Courses',
          icon: 'truck',
          items: results.courses.map((c) => ({
            id: c.id,
            label: c.quoi || 'Course',
            sub: c.chantier?.num,
            path: c.chantier_id ? `/chantiers/${c.chantier_id}/courses` : '/courses',
          })),
        },
      ].filter((g) => g.items.length > 0)
    : []

  const hasResults = groups.length > 0

  return (
    <div className="gsearch" ref={wrapRef}>
      <input
        ref={inputRef}
        className="gsearch-input"
        placeholder="Rechercher…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results && setOpen(true)}
      />
      {open && q.trim().length >= 2 && (
        <div className="gsearch-results">
          {loading && <div className="gsearch-empty">Recherche…</div>}
          {!loading && !hasResults && <div className="gsearch-empty">Aucun résultat</div>}
          {!loading &&
            groups.map((g) => (
              <div key={g.key} className="gsearch-group">
                <div className="gsearch-group-head">
                  <Icon name={g.icon} size={12} />
                  <span>{g.label}</span>
                </div>
                {g.items.map((it) => (
                  <button key={it.id} className="gsearch-item" onClick={() => go(it.path)}>
                    <span className="gsearch-item-lbl">{it.label}</span>
                    {it.sub && <span className="gsearch-item-sub">{it.sub}</span>}
                  </button>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

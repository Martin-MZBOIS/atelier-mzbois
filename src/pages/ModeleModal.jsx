import { useEffect, useState } from 'react'
import { raccourcisModal } from '../lib/clavier'
import { supabase } from '../lib/supabase'
import { TYP_ACHAT, TYP_ACHAT_ORDER } from '../lib/statuts'
import Autocomplete from '../components/Autocomplete'

const STATUTS_DEFAUT = [
  { value: 'en_stock', label: 'En stock' },
  { value: 'a_commander', label: 'À commander' },
]

// Création / édition d'un ouvrage modèle + sa composition en articles (0018).
export default function ModeleModal({ modele, onClose, onSaved }) {
  const isEdit = Boolean(modele)
  const [form, setForm] = useState({
    nom: modele?.nom ?? '',
    description: modele?.description ?? '',
  })
  const [typs, setTyps] = useState(() => modele?.typs ?? [])
  const [articles, setArticles] = useState([])
  const [compo, setCompo] = useState([]) // [{ article_id, nom, quantite, statut_defaut }]
  const [compoWarn, setCompoWarn] = useState(false) // table modele_articles absente
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Charge la bibliothèque d'articles + la composition existante.
  useEffect(() => {
    let active = true
    async function load() {
      const art = await supabase.from('articles').select('id, nom, typ').order('nom')
      if (active) setArticles(art.data ?? [])
      if (isEdit) {
        const { data, error: e } = await supabase
          .from('modele_articles')
          .select('article_id, quantite, statut_defaut, article:articles!article_id(nom)')
          .eq('modele_id', modele.id)
        if (!active) return
        if (e) {
          if (/modele_articles/.test(e.message)) setCompoWarn(true)
        } else {
          setCompo(
            (data ?? []).map((r) => ({
              article_id: r.article_id,
              nom: r.article?.nom ?? '—',
              quantite: r.quantite ?? 1,
              statut_defaut: r.statut_defaut ?? 'a_commander',
            }))
          )
        }
      }
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function toggleTyp(slug) {
    setTyps((prev) => (prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug]))
  }
  function addArticle(a) {
    if (!a) return
    setCompo((prev) =>
      prev.some((c) => c.article_id === a.id)
        ? prev
        : [...prev, { article_id: a.id, nom: a.nom, quantite: 1, statut_defaut: 'a_commander' }]
    )
  }
  function setCompoField(id, key, value) {
    setCompo((prev) => prev.map((c) => (c.article_id === id ? { ...c, [key]: value } : c)))
  }
  function removeCompo(id) {
    setCompo((prev) => prev.filter((c) => c.article_id !== id))
  }

  const availableArticles = articles.filter((a) => !compo.some((c) => c.article_id === a.id))

  async function handleSave() {
    if (!form.nom.trim()) {
      setError('Le nom est obligatoire.')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      nom: form.nom.trim(),
      description: form.description.trim() || null,
      typs,
    }

    let modeleId = modele?.id
    if (isEdit) {
      const { error: dbError } = await supabase.from('ouvrage_modeles').update(payload).eq('id', modeleId)
      if (dbError) return fail(dbError.message)
    } else {
      const { data, error: dbError } = await supabase
        .from('ouvrage_modeles')
        .insert(payload)
        .select('id')
        .single()
      if (dbError) return fail(dbError.message)
      modeleId = data.id
    }

    // Composition : on resynchronise (efface puis réinsère). Ignoré si table absente.
    const del = await supabase.from('modele_articles').delete().eq('modele_id', modeleId)
    if (del.error && /modele_articles/.test(del.error.message)) {
      setSaving(false)
      onSaved()
      return
    }
    if (compo.length) {
      const rows = compo.map((c) => ({
        modele_id: modeleId,
        article_id: c.article_id,
        quantite: Number(c.quantite) || 1,
        statut_defaut: c.statut_defaut,
      }))
      const { error: insErr } = await supabase.from('modele_articles').insert(rows)
      if (insErr) return fail('Modèle enregistré mais composition en échec : ' + insErr.message)
    }

    setSaving(false)
    onSaved()

    function fail(msg) {
      setError(msg)
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={raccourcisModal(handleSave, onClose, saving)}
      >
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="modal-title">{isEdit ? 'Modifier le modèle' : 'Nouvel ouvrage modèle'}</div>

        <div className="fl">
          <label>Nom *</label>
          <input value={form.nom} onChange={(e) => set('nom', e.target.value)} autoFocus />
        </div>

        <div className="fl">
          <label>Description</label>
          <input value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div className="sl">Typologies</div>
        <div className="checkbox-grid">
          {TYP_ACHAT_ORDER.map((slug) => (
            <label key={slug} className="checkbox-label">
              <input type="checkbox" checked={typs.includes(slug)} onChange={() => toggleTyp(slug)} />
              {TYP_ACHAT[slug].label}
            </label>
          ))}
        </div>

        <div className="sl" style={{ marginTop: 12 }}>Articles composants</div>
        {compoWarn && (
          <div className="alert" style={{ marginBottom: 8 }}>
            Exécute la migration <code>0018_modele_articles.sql</code> pour composer le modèle.
          </div>
        )}
        {compo.length > 0 && (
          <div className="compo-list">
            {compo.map((c) => (
              <div key={c.article_id} className="compo-row">
                <span className="compo-nom">{c.nom}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="compo-qty"
                  value={c.quantite}
                  onChange={(e) => setCompoField(c.article_id, 'quantite', e.target.value)}
                  title="Quantité"
                />
                <select
                  className="ss"
                  value={c.statut_defaut}
                  onChange={(e) => setCompoField(c.article_id, 'statut_defaut', e.target.value)}
                >
                  {STATUTS_DEFAUT.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <button type="button" className="chip-x" onClick={() => removeCompo(c.article_id)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <Autocomplete
          items={availableArticles}
          value={null}
          onSelect={addArticle}
          getLabel={(a) => a.nom}
          getKey={(a) => a.id}
          clearOnSelect
          placeholder="🔍 Ajouter un article de la bibliothèque…"
        />

        {error && <div className="alert">{error}</div>}

        <div className="modal-actions">
          <button className="btn bp" disabled={saving} onClick={handleSave}>
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
          </button>
          <button className="btn bg" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

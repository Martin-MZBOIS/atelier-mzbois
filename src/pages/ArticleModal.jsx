import { useMemo, useState } from 'react'
import { raccourcisModal } from '../lib/clavier'
import { supabase } from '../lib/supabase'
import { useSettings } from '../store/settings'
import { TYP_ACHAT, TYP_ACHAT_ORDER } from '../lib/statuts'
import Autocomplete from '../components/Autocomplete'

function num(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

// Création / édition d'un article de bibliothèque (+ fournisseurs associés).
export default function ArticleModal({ article, fournisseurs, onClose, onSaved }) {
  const isEdit = Boolean(article)
  const unites = useSettings((s) => s.unites)
  // Unité : réel <select> alimenté par les paramètres + option « Autre » (champ libre).
  const initUnite = article?.unite ?? ''
  const initIsAutre = initUnite !== '' && !unites.includes(initUnite)
  const [uniteChoice, setUniteChoice] = useState(initIsAutre ? '__autre__' : initUnite)
  const [uniteAutre, setUniteAutre] = useState(initIsAutre ? initUnite : '')

  const [form, setForm] = useState({
    nom: article?.nom ?? '',
    description: article?.description ?? '',
    typ: article?.typ ?? 'panneau',
    prix: article?.prix ?? '',
  })
  const [fids, setFids] = useState(
    () =>
      (article?.article_fournisseurs ?? [])
        .map((af) => af.fournisseur?.id)
        .filter(Boolean)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function addFid(id) {
    setFids((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }
  function removeFid(id) {
    setFids((prev) => prev.filter((x) => x !== id))
  }

  // Sous-traitance → cherche parmi les sous-traitants, sinon parmi les fournisseurs.
  const isSousTraitance = form.typ === 'sous_traitance'
  const wantType = isSousTraitance ? 'sous_traitant' : 'fournisseur'
  const fournById = Object.fromEntries(fournisseurs.map((f) => [f.id, f]))
  const suggestions = useMemo(
    () =>
      fournisseurs.filter(
        (f) => (f.type ?? 'fournisseur') === wantType && !fids.includes(f.id)
      ),
    [fournisseurs, wantType, fids]
  )
  const uniteFinal = uniteChoice === '__autre__' ? uniteAutre.trim() : uniteChoice

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
      typ: form.typ || null,
      prix: num(form.prix),
      unite: uniteFinal || null,
    }

    let articleId = article?.id
    if (isEdit) {
      const { error: uErr } = await supabase.from('articles').update(payload).eq('id', articleId)
      if (uErr) {
        setSaving(false)
        setError(uErr.message)
        return
      }
      // Resynchronise les fournisseurs : on efface puis on réinsère.
      await supabase.from('article_fournisseurs').delete().eq('article_id', articleId)
    } else {
      const { data, error: iErr } = await supabase.from('articles').insert(payload).select('id').single()
      if (iErr) {
        setSaving(false)
        setError(iErr.message)
        return
      }
      articleId = data.id
    }

    if (fids.length) {
      const rows = fids.map((fid) => ({ article_id: articleId, fournisseur_id: fid }))
      const { error: jErr } = await supabase.from('article_fournisseurs').insert(rows)
      if (jErr) {
        setSaving(false)
        setError('Article enregistré mais fournisseurs en échec : ' + jErr.message)
        return
      }
    }
    setSaving(false)
    onSaved()
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
        <div className="modal-title">{isEdit ? "Modifier l'article" : 'Nouvel article'}</div>

        <div className="fg">
          <div className="fl">
            <label>Nom *</label>
            <input value={form.nom} onChange={(e) => set('nom', e.target.value)} autoFocus />
          </div>
          <div className="fl">
            <label>Typologie</label>
            <select value={form.typ} onChange={(e) => set('typ', e.target.value)}>
              {TYP_ACHAT_ORDER.map((slug) => (
                <option key={slug} value={slug}>
                  {TYP_ACHAT[slug].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="fl">
          <label>Description</label>
          <input value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div className="fg">
          <div className="fl">
            <label>Prix (€)</label>
            <input type="number" step="0.01" value={form.prix} onChange={(e) => set('prix', e.target.value)} />
          </div>
          <div className="fl">
            <label>Unité</label>
            <select value={uniteChoice} onChange={(e) => setUniteChoice(e.target.value)}>
              <option value="">—</option>
              {unites.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
              <option value="__autre__">Autre…</option>
            </select>
            {uniteChoice === '__autre__' && (
              <input
                style={{ marginTop: 6 }}
                value={uniteAutre}
                onChange={(e) => setUniteAutre(e.target.value)}
                placeholder="Saisir une unité…"
                autoFocus
              />
            )}
          </div>
        </div>

        <div className="sl">{isSousTraitance ? 'Sous-traitant' : 'Fournisseurs'}</div>
        {fids.length > 0 && (
          <div className="chip-row">
            {fids.map((id) => (
              <span key={id} className="chip-select">
                {fournById[id]?.nom ?? '—'}
                <button type="button" className="chip-x" onClick={() => removeFid(id)}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="autocomplete-scroll">
          <Autocomplete
            items={suggestions}
            value={null}
            onSelect={(f) => f && addFid(f.id)}
            getLabel={(f) => f.nom}
            getKey={(f) => f.id}
            clearOnSelect
            placeholder={isSousTraitance ? '🔍 Ajouter un sous-traitant…' : '🔍 Ajouter un fournisseur…'}
          />
        </div>

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

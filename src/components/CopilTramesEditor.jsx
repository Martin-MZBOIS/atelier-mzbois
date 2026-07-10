import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_TRAMES } from '../lib/copil'

const TYPES = [
  { id: 'reunion_chantiers', label: 'Réunion de chantiers' },
  { id: 'hommes_cles', label: 'Hommes clés' },
  { id: 'strategie', label: 'Stratégie' },
]

// Trame stockée ({ titre, points[] }) → forme éditable ({ titre, pointsText }).
function toEditable(sections) {
  return (sections ?? []).map((s) => ({
    titre: s.titre ?? '',
    pointsText: (s.points ?? []).join('\n'),
  }))
}
// Forme éditable → trame stockée.
function fromEditable(sections) {
  return sections.map((s) => ({
    titre: s.titre,
    points: s.pointsText.split('\n').map((p) => p.trim()).filter(Boolean),
  }))
}

// Éditeur des trames de réunion COPIL (Paramètres, Dirigeant).
// Lit/écrit copil_trames (migration 0024) avec repli sur les trames par défaut.
export default function CopilTramesEditor() {
  const [type, setType] = useState('reunion_chantiers')
  // `pointsText` : les points édités sous forme de texte (une ligne = un point).
  // Champs contrôlés : sinon le contenu des textareas resterait celui de la
  // trame précédente au changement d'onglet (nœuds DOM réutilisés par React).
  const [sections, setSections] = useState(() => toEditable(DEFAULT_TRAMES.reunion_chantiers))
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    setMsg('')
    setSections(toEditable(DEFAULT_TRAMES[type] ?? []))
    supabase
      .from('copil_trames')
      .select('sections')
      .eq('type', type)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.sections?.length) setSections(toEditable(data.sections))
      })
    return () => {
      active = false
    }
  }, [type])

  function setSectionTitre(i, titre) {
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, titre } : s)))
  }
  function setSectionPoints(i, pointsText) {
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, pointsText } : s)))
  }
  function move(i, dir) {
    setSections((prev) => {
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const arr = [...prev]
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return arr
    })
  }
  function addSection() {
    setSections((prev) => [...prev, { titre: 'Nouvelle section', pointsText: '' }])
  }
  function removeSection(i) {
    setSections((prev) => prev.filter((_, idx) => idx !== i))
  }
  function reset() {
    setSections(toEditable(DEFAULT_TRAMES[type] ?? []))
  }

  async function save() {
    setSaving(true)
    setMsg('')
    const { error } = await supabase
      .from('copil_trames')
      .upsert(
        { type, sections: fromEditable(sections), modifie_le: new Date().toISOString() },
        { onConflict: 'type' }
      )
    setSaving(false)
    if (error) {
      setMsg(
        /copil_trames/.test(error.message)
          ? 'Table copil_trames absente : exécutez la migration 0024.'
          : 'Échec : ' + error.message
      )
    } else {
      setMsg('✓ Trame enregistrée')
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Trames de réunion (COPIL)</span>
      </div>
      <div className="param-hint" style={{ marginBottom: 10 }}>
        Modifiez les trames appliquées aux prochaines réunions (les comptes-rendus
        déjà clôturés ne changent pas).
      </div>

      <nav className="subtabs" style={{ marginBottom: 12 }}>
        {TYPES.map((t) => (
          <button
            key={t.id}
            className={'subtab' + (type === t.id ? ' subtab--active' : '')}
            onClick={() => setType(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {sections.map((s, i) => (
        <div key={i} className="trame-edit">
          <div className="trame-edit-head">
            <input
              className="trame-edit-titre"
              value={s.titre}
              onChange={(e) => setSectionTitre(i, e.target.value)}
            />
            <div className="trame-edit-actions">
              <button className="btn bg bxs" onClick={() => move(i, -1)} title="Monter">↑</button>
              <button className="btn bg bxs" onClick={() => move(i, 1)} title="Descendre">↓</button>
              <button className="btn bg bxs" onClick={() => removeSection(i)} title="Supprimer">×</button>
            </div>
          </div>
          <textarea
            className="ni"
            rows={Math.max(2, s.pointsText.split('\n').length)}
            value={s.pointsText}
            onChange={(e) => setSectionPoints(i, e.target.value)}
            placeholder="Un point par ligne…"
          />
        </div>
      ))}

      <div className="param-add" style={{ marginTop: 8 }}>
        <button className="btn bg bsm" onClick={addSection}>+ Ajouter une section</button>
        <button className="btn bg bsm" onClick={reset}>Réinitialiser</button>
        <button className="btn bp bsm" onClick={save} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer la trame'}
        </button>
      </div>
      {msg && <div className="param-msg" style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  )
}

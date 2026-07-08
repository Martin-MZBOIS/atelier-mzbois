import { useEffect, useState } from 'react'
import { useSettings } from '../store/settings'
import { useAuthStore } from '../store'

export default function Parametres() {
  const role = useAuthStore((s) => s.user?.role)
  const settings = useSettings()
  const save = useSettings((s) => s.save)

  const [form, setForm] = useState({
    cout_horaire: settings.cout_horaire,
    alerte_orange: settings.alerte_orange,
    alerte_rouge: settings.alerte_rouge,
  })
  const [unites, setUnites] = useState(settings.unites)
  const [newUnite, setNewUnite] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Resynchronise le formulaire une fois les paramètres chargés.
  useEffect(() => {
    setForm({
      cout_horaire: settings.cout_horaire,
      alerte_orange: settings.alerte_orange,
      alerte_rouge: settings.alerte_rouge,
    })
    setUnites(settings.unites)
  }, [settings.loaded, settings.cout_horaire, settings.alerte_orange, settings.alerte_rouge, settings.unites])

  if (role !== 'dir') {
    return (
      <section className="page">
        <div className="alert">Accès réservé à la Direction.</div>
      </section>
    )
  }

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function addUnite() {
    const u = newUnite.trim()
    if (u && !unites.includes(u)) setUnites((prev) => [...prev, u])
    setNewUnite('')
  }
  function removeUnite(u) {
    setUnites((prev) => prev.filter((x) => x !== u))
  }

  async function handleSave() {
    setSaving(true)
    setMsg('')
    const err = await save({
      cout_horaire: Number(form.cout_horaire) || 0,
      alerte_orange: parseInt(form.alerte_orange, 10) || 0,
      alerte_rouge: parseInt(form.alerte_rouge, 10) || 0,
      unites,
    })
    setSaving(false)
    setMsg(err ? 'Échec : ' + err.message : '✓ Paramètres enregistrés')
  }

  return (
    <section className="page">
      <div className="page-head">
        <h2>Paramètres</h2>
      </div>

      {!settings.available && (
        <div className="alert">
          Table de configuration absente.
          <div className="alert-sub">
            Exécute la migration{' '}
            <code>supabase/migrations/0013_parametres.sql</code> dans Supabase
            (les valeurs affichées sont les défauts).
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <span className="card-title">Analytique</span>
        </div>
        <div className="fl">
          <label>Coût horaire moyen (€/h)</label>
          <input
            type="number"
            step="0.01"
            value={form.cout_horaire}
            onChange={(e) => set('cout_horaire', e.target.value)}
          />
          <div className="param-hint">
            Utilisé pour valoriser les heures dans l'onglet Analytique.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">Seuils d'alerte des tâches</span>
        </div>
        <div className="fg">
          <div className="fl">
            <label>🟠 Orange après (jours)</label>
            <input
              type="number"
              min="1"
              value={form.alerte_orange}
              onChange={(e) => set('alerte_orange', e.target.value)}
            />
          </div>
          <div className="fl">
            <label>🔴 Rouge après (jours)</label>
            <input
              type="number"
              min="1"
              value={form.alerte_rouge}
              onChange={(e) => set('alerte_rouge', e.target.value)}
            />
          </div>
        </div>
        <div className="param-hint">
          Une tâche non terminée passe en orange puis en rouge selon son
          ancienneté (tableau de bord).
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">Unités des articles</span>
        </div>
        <div className="chip-row">
          {unites.map((u) => (
            <span key={u} className="chip-select">
              {u}
              <button type="button" className="chip-x" onClick={() => removeUnite(u)}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="param-add">
          <input
            value={newUnite}
            placeholder="Nouvelle unité…"
            onChange={(e) => setNewUnite(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addUnite()}
          />
          <button className="btn bg bsm" onClick={addUnite}>
            + Ajouter
          </button>
        </div>
      </div>

      <div className="param-actions">
        <button className="btn bp" disabled={saving} onClick={handleSave}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {msg && <span className="param-msg">{msg}</span>}
      </div>
    </section>
  )
}

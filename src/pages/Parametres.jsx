import { useEffect, useState } from 'react'
import { useSettings, ROLE_DEFAULT_DENY } from '../store/settings'
import { useAuthStore } from '../store'
import CopilTramesEditor from '../components/CopilTramesEditor'

// Onglets pouvant être activés/désactivés par rôle.
const FEATURES = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'chantiers', label: 'Chantiers' },
  { id: 'achats', label: 'Achats' },
  { id: 'courses', label: 'Courses' },
  { id: 'planning', label: 'Planning' },
  { id: 'bibliotheque', label: 'Bibliothèques' },
  { id: 'copil', label: 'COPIL' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'assistance', label: 'Assistance' },
]
const ROLE_COLS = [
  { id: 'be', label: 'BE' },
  { id: 'prog', label: 'Prog' },
  { id: 'prod', label: 'Resp. Prod' },
  { id: 'ca', label: 'CA' },
  { id: 'admin', label: 'Admin' },
]

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
  const [specialites, setSpecialites] = useState(settings.specialites ?? [])
  const [newSpec, setNewSpec] = useState('')
  const [droits, setDroits] = useState(settings.droits)
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
    setSpecialites(settings.specialites ?? [])
    setDroits(settings.droits ?? {})
  }, [settings.loaded, settings.cout_horaire, settings.alerte_orange, settings.alerte_rouge, settings.unites, settings.specialites, settings.droits])

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
  function addSpec() {
    const s = newSpec.trim()
    if (s && !specialites.includes(s)) setSpecialites((prev) => [...prev, s])
    setNewSpec('')
  }
  function removeSpec(s) {
    setSpecialites((prev) => prev.filter((x) => x !== s))
  }
  function isAllowed(roleId, featureId) {
    const explicit = droits[roleId]?.[featureId]
    if (explicit === true) return true
    if (explicit === false) return false
    return !(ROLE_DEFAULT_DENY[roleId] ?? []).includes(featureId)
  }
  function toggleDroit(roleId, featureId) {
    setDroits((prev) => {
      const roleD = { ...(prev[roleId] ?? {}) }
      roleD[featureId] = !isAllowed(roleId, featureId) // inverse l'état courant
      return { ...prev, [roleId]: roleD }
    })
  }

  async function handleSave() {
    setSaving(true)
    setMsg('')
    const patch = {
      cout_horaire: Number(form.cout_horaire) || 0,
      alerte_orange: parseInt(form.alerte_orange, 10) || 0,
      alerte_rouge: parseInt(form.alerte_rouge, 10) || 0,
      unites,
      specialites,
      droits,
    }
    let err = await save(patch)
    // Repli si la colonne specialites (migration 0023) n'existe pas encore.
    if (err && /specialites/.test(err.message)) {
      const { specialites: _omit, ...rest } = patch
      err = await save(rest)
    }
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

      <div className="card">
        <div className="card-head">
          <span className="card-title">Spécialités des sous-traitants</span>
        </div>
        <div className="chip-row">
          {specialites.map((s) => (
            <span key={s} className="chip-select">
              {s}
              <button type="button" className="chip-x" onClick={() => removeSpec(s)}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="param-add">
          <input
            value={newSpec}
            placeholder="Nouvelle spécialité…"
            onChange={(e) => setNewSpec(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSpec()}
          />
          <button className="btn bg bsm" onClick={addSpec}>
            + Ajouter
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">Droits d'accès par rôle</span>
        </div>
        <div className="param-hint" style={{ marginBottom: 10 }}>
          La Direction a toujours accès à tout. Décoche pour masquer un onglet à
          un rôle.
        </div>
        <div className="cal-scroll">
          <table className="droits-table">
            <thead>
              <tr>
                <th>Onglet</th>
                <th className="droits-locked">Dir</th>
                {ROLE_COLS.map((r) => (
                  <th key={r.id}>{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.id}>
                  <td>{f.label}</td>
                  <td className="droits-locked">✓</td>
                  {ROLE_COLS.map((r) => (
                    <td key={r.id}>
                      <input
                        type="checkbox"
                        checked={isAllowed(r.id, f.id)}
                        onChange={() => toggleDroit(r.id, f.id)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CopilTramesEditor />

      <div className="param-actions">
        <button className="btn bp" disabled={saving} onClick={handleSave}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {msg && <span className="param-msg">{msg}</span>}
      </div>
    </section>
  )
}

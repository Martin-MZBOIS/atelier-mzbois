import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store'
import { ROLES, ROLE_ORDER } from '../lib/roles'

// Mode démo : on choisit un rôle, on charge l'utilisateur de test correspondant
// depuis la table `utilisateurs`. Si la base n'est pas encore initialisée,
// on retombe sur un profil local afin que la maquette reste utilisable.
export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')

  async function handleSelectRole(roleKey) {
    setLoading(roleKey)
    setError('')
    try {
      const { data, error: dbError } = await supabase
        .from('utilisateurs')
        .select('id, email, role, prenom, nom')
        .eq('role', roleKey)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (dbError) throw dbError

      const user =
        data ?? {
          id: null,
          email: `${roleKey}@demo.local`,
          role: roleKey,
          prenom: 'Utilisateur',
          nom: ROLES[roleKey].label,
          demo: true,
        }

      login(user)
      navigate('/chantiers', { replace: true })
    } catch (e) {
      setError(
        "Impossible de charger l'utilisateur. Vérifie que le schéma et le seed " +
          'ont été exécutés dans Supabase. (' + (e.message ?? e) + ')'
      )
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo">MZ</span>
          <div>
            <h1>Atelier MZ Bois</h1>
            <p>Gestion de chantiers de menuiserie</p>
          </div>
        </div>

        <p className="login-hint">Connexion démo — choisis ton rôle&nbsp;:</p>

        <div className="role-grid">
          {ROLE_ORDER.map((key) => {
            const role = ROLES[key]
            return (
              <button
                key={key}
                className="role-btn"
                style={{ '--role-color': role.color }}
                disabled={loading !== null}
                onClick={() => handleSelectRole(key)}
              >
                <span className="role-badge">{role.short}</span>
                <span className="role-label">{role.label}</span>
                {loading === key && <span className="role-spinner">…</span>}
              </button>
            )
          })}
        </div>

        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  )
}

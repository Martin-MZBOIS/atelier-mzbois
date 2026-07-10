import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuthStore } from '../store'

// Résout la fiche `employes` de l'utilisateur connecté.
//
// Les tâches (`taches.assigne_a`) et les actions de réunion référencent
// `employes`, alors que la connexion s'appuie sur `utilisateurs` : le lien
// entre les deux se fait par l'email (voir migration 0026).
//
// Renvoie { employe, employeId, loading }. `employeId` vaut null tant que la
// fiche n'est pas résolue (ou si l'utilisateur n'en a pas).
export function useMonEmploye() {
  const email = useAuthStore((s) => s.user?.email)
  const [employe, setEmploye] = useState(null)
  const [loading, setLoading] = useState(Boolean(email))

  useEffect(() => {
    if (!email) {
      setEmploye(null)
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    supabase
      .from('employes')
      .select('id, prenom, nom, role, email')
      .eq('email', email)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setEmploye(data ?? null)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [email])

  return { employe, employeId: employe?.id ?? null, loading }
}

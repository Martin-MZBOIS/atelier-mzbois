import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

// Abonnement temps réel Supabase sur une table.
// À chaque INSERT/UPDATE/DELETE, appelle `onChange` (rechargement des données),
// avec un léger debounce pour éviter les rafales lors de mises à jour groupées.
//
// Prérequis côté Supabase : la table doit être ajoutée à la publication
// `supabase_realtime` (Database > Replication) pour émettre les évènements.
//
// enabled : permet de désactiver l'abonnement (ex : pendant le chargement).
export function useRealtime(table, onChange, { enabled = true, filter } = {}) {
  const cbRef = useRef(onChange)
  cbRef.current = onChange

  useEffect(() => {
    if (!enabled || !table) return
    let timer = null
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(() => cbRef.current?.(), 250)
    }

    const channel = supabase
      .channel(`rt-${table}-${filter ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        schedule
      )
      .subscribe()

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [table, enabled, filter])
}

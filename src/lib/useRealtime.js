import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

let channelSeq = 0

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

  // Topic unique par instance de hook. `supabase.channel(topic)` renvoie le
  // canal existant si le topic est déjà pris ; deux composants abonnés à la
  // même table (ex. Dashboard et la cloche pour `taches`) appelleraient alors
  // `.on()` sur un canal déjà souscrit, ce qui lève une exception.
  const topicRef = useRef(null)
  if (topicRef.current === null) topicRef.current = ++channelSeq

  useEffect(() => {
    if (!enabled || !table) return
    let timer = null
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(() => cbRef.current?.(), 250)
    }

    let channel
    try {
      channel = supabase
        .channel(`rt-${table}-${filter ?? 'all'}-${topicRef.current}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
          schedule
        )
        .subscribe()
    } catch (e) {
      // Le temps réel est un confort : une erreur d'abonnement ne doit jamais
      // faire tomber la page qui l'utilise.
      console.warn(`Realtime indisponible pour "${table}" :`, e)
      return () => clearTimeout(timer)
    }

    return () => {
      clearTimeout(timer)
      if (channel) supabase.removeChannel(channel)
    }
  }, [table, enabled, filter])
}

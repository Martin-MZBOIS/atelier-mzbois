import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// Valeurs par défaut (utilisées si la table parametres n'existe pas encore).
export const DEFAULT_SETTINGS = {
  cout_horaire: 45,
  alerte_orange: 3,
  alerte_rouge: 7,
  unites: ['panneau', 'ml', 'm²', 'pièce', 'rouleau'],
  droits: {},
}

// Onglets masqués par défaut pour certains rôles (le Dirigeant peut réactiver
// via la matrice des droits ; une valeur explicite `true` prime).
export const ROLE_DEFAULT_DENY = {
  ca: ['planning', 'copil'],
  admin: ['planning', 'copil'],
}

// Store de configuration globale (chargé une fois après login).
export const useSettings = create((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,
  available: false, // true si la table parametres existe

  load: async () => {
    const { data, error } = await supabase
      .from('parametres')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    if (error) {
      // Table absente (migration 0013 non passée) → on garde les défauts.
      set({ loaded: true, available: false })
      return
    }
    set({
      ...DEFAULT_SETTINGS,
      ...(data ?? {}),
      loaded: true,
      available: true,
    })
  },

  save: async (patch) => {
    const { error } = await supabase.from('parametres').update(patch).eq('id', 1)
    if (!error) set(patch)
    return error
  },

  // Accès d'un rôle à un onglet (dir = tout ; défaut = autorisé sauf règles
  // de rôle ; une valeur explicite dans la matrice des droits prime).
  canAccess: (role, tabId) => {
    if (role === 'dir') return true
    const droits = get().droits ?? {}
    const explicit = droits[role]?.[tabId]
    if (explicit === true) return true
    if (explicit === false) return false
    return !(ROLE_DEFAULT_DENY[role] ?? []).includes(tabId)
  },
}))

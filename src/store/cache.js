import { create } from 'zustand'

// Cache mémoire simple des listes déjà chargées (stale-while-revalidate).
// - `get(key)` renvoie les données mémorisées (ou undefined) pour un affichage
//   instantané au retour sur une page.
// - `set(key, data)` mémorise après un chargement.
// - `invalidate(key)` (ou `invalidate()` pour tout vider) après une écriture
//   create/update/delete, pour forcer un rechargement.
export const useDataCache = create((set, get) => ({
  cache: {},
  get: (key) => get().cache[key],
  set: (key, data) =>
    set((s) => ({ cache: { ...s.cache, [key]: data } })),
  invalidate: (key) =>
    set((s) => {
      if (!key) return { cache: {} }
      const next = { ...s.cache }
      delete next[key]
      return { cache: next }
    }),
}))

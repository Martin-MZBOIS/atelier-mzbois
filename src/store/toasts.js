import { create } from 'zustand'

// File des messages de retour (« Statut mis à jour », « Échec : … »).
//
// Une action qui écrit en base doit toujours dire qu'elle a abouti : sans ce
// retour, l'utilisateur ne sait pas si son clic a été pris en compte.
export const useToasts = create((set, get) => ({
  items: [],
  push: (texte, ton = 'ok', duree = 3200) => {
    const id = Date.now() + Math.random()
    set((s) => ({ items: [...s.items, { id, texte, ton }] }))
    // Les erreurs restent affichées plus longtemps : on doit pouvoir les lire.
    setTimeout(() => get().remove(id), ton === 'error' ? 6000 : duree)
    return id
  },
  remove: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}))

// Helpers utilisables hors composant React.
export function toast(texte, duree) {
  return useToasts.getState().push(texte, 'ok', duree)
}
toast.error = (texte) => useToasts.getState().push(texte, 'error')
toast.info = (texte) => useToasts.getState().push(texte, 'info')

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Store d'authentification (mode démo).
// L'utilisateur courant est persisté en localStorage pour survivre au refresh.
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'mzbois-auth' }
  )
)

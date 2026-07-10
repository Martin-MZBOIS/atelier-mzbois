// Helpers partagés par les tableaux de bord (un par rôle).

// AAAA-MM-JJ local (évite le décalage UTC de toISOString).
export function isoDay(d = new Date()) {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}

// Jours restants avant une date (négatif = passée).
export function daysUntil(dateStr) {
  if (!dateStr) return 999
  return Math.floor((new Date(dateStr) - new Date()) / 86400000)
}

// Jours écoulés depuis une date.
export function daysSince(dateStr) {
  if (!dateStr) return 0
  return Math.floor((new Date() - new Date(dateStr)) / 86400000)
}

// Jours avant la prochaine occurrence (jour/mois) d'une date ; 0 = aujourd'hui.
export function daysUntilAnniv(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let next = new Date(now.getFullYear(), d.getMonth(), d.getDate())
  if (next < today) next = new Date(now.getFullYear() + 1, d.getMonth(), d.getDate())
  return Math.round((next - today) / 86400000)
}

// Ancienneté d'une tâche : 'ok' | 'warn' | 'late' (seuils réglés en Paramètres).
export function taskAge(t, warn, late) {
  const d = daysSince(t.created_at)
  if (d >= late) return 'late'
  if (d >= warn) return 'warn'
  return 'ok'
}

// Les 5 jours ouvrés (lundi→vendredi) de la semaine courante.
export function week5() {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export const JOURS5 = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']

export const CHANTIER_COLORS = [
  '#FEE2E2', '#DBEAFE', '#D1FAE5', '#EDE9FE', '#FEF3C7', '#FCE7F3', '#E0F2FE',
]

// Statuts d'ouvrage considérés comme clos.
export const CLOS = ['termine', 'facture']

export function eur(n) {
  return Math.round(Number(n) || 0).toLocaleString('fr-FR') + ' €'
}

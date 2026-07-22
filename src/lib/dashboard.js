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
//
// Attention : c'est le temps écoulé depuis la CRÉATION, pas un retard. Une
// tâche ouverte depuis trois semaines mais due le mois prochain est 'late'
// ici sans être en retard pour autant — voir `tacheEnRetard`.
export function taskAge(t, warn, late) {
  const d = daysSince(t.created_at)
  if (d >= late) return 'late'
  if (d >= warn) return 'warn'
  return 'ok'
}

// Tâche réellement en retard : son échéance est passée et elle n'est pas faite.
// Sans échéance, une tâche ne peut pas être en retard.
export function tacheEnRetard(t) {
  if (t.done || !t.echeance) return false
  const fin = new Date(t.echeance)
  if (Number.isNaN(fin.getTime())) return false
  fin.setHours(23, 59, 59, 999) // on laisse le jour d'échéance en entier
  return fin < new Date()
}

// Amène un bloc à l'écran, dans le conteneur qui défile réellement.
//
// `scrollIntoView` visait la fenêtre, qui ne défile pas ici : c'est `.app-main`
// qui porte le défilement. Et l'animation « smooth » ne démarre pas dans tous
// les environnements — on retombe donc sur un saut immédiat si rien n'a bougé.
export function amenerAlEcran(el) {
  if (!el) return
  let boite = el.parentElement
  while (boite && boite !== document.body) {
    const oy = getComputedStyle(boite).overflowY
    if ((oy === 'auto' || oy === 'scroll') && boite.scrollHeight > boite.clientHeight) break
    boite = boite.parentElement
  }
  const conteneur = boite && boite !== document.body ? boite : document.scrollingElement
  if (!conteneur) return

  const depart = conteneur.scrollTop
  const cible = Math.max(
    0,
    el.getBoundingClientRect().top -
      conteneur.getBoundingClientRect().top +
      depart -
      12
  )
  if (Math.abs(cible - depart) < 2) return

  const anime = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  conteneur.scrollTo({ top: cible, behavior: anime ? 'smooth' : 'auto' })
  setTimeout(() => {
    if (conteneur.scrollTop === depart) conteneur.scrollTop = cible
  }, 150)
}

// Destination d'une alerte qui porte sur des ouvrages ou des feedbacks.
//
// Ces éléments vivent dans les onglets d'un chantier : renvoyer vers la liste
// brute obligerait à les rechercher à la main. Un seul chantier concerné → on y
// va directement, sur le bon onglet ; plusieurs → on restreint la liste des
// chantiers à ceux qui sont en cause, en annonçant pourquoi.
export function ouvrirAlerte(navigate, elements, onglet, titre) {
  const ids = [
    ...new Set(
      elements.map((e) => e.chantier_id ?? e.chantier?.id).filter(Boolean)
    ),
  ]
  if (ids.length === 1) {
    navigate(`/chantiers/${ids[0]}/${onglet}`)
    return
  }
  navigate('/chantiers', { state: { focus: { ids, titre, onglet } } })
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

// Trames de réunion par défaut (utilisées si la table copil_trames — migration
// 0024 — n'est pas encore renseignée). Chaque section : { titre, points[] }.
export const DEFAULT_TRAMES = {
  reunion_chantiers: [
    { titre: 'Revue des actions de la semaine passée', points: ['Liste des actions ✅ / ❌'] },
    { titre: 'Point par chantier', points: ['Statut général', 'Points bloquants', 'Décisions prises'] },
    { titre: 'Actions de la semaine', points: ['Qui fait quoi avant lundi prochain'] },
  ],
  hommes_cles: [
    { titre: 'Revue des actions de la dernière réunion', points: ['Liste des actions ✅ / ❌'] },
    { titre: "Sujets de l'ordre du jour", points: ['Discussion (notes libres)', 'Décision prise', 'Action associée + assigné à'] },
    { titre: 'Divers', points: ['Notes libres'] },
    { titre: 'Prochaine réunion', points: ['Date confirmée'] },
  ],
  strategie: [
    { titre: 'Bilan des 6 derniers mois', points: ['CA réalisé vs objectif', 'Marge', 'Points marquants'] },
    { titre: 'Analyse', points: ['Ce qui a bien fonctionné', "Ce qui doit s'améliorer"] },
    { titre: 'Objectifs des 6 prochains mois', points: ['CA cible', 'Nouveaux marchés / clients', 'Priorités'] },
    { titre: 'Décisions stratégiques', points: ['Notes libres'] },
    { titre: 'Actions', points: ['Qui / Quoi / Quand'] },
  ],
}

// Helpers de dates pour les réunions COPIL.

function atMidnight(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// 1er jeudi d'un mois donné (jeudi = getDay() 4).
function firstThursday(year, month) {
  const d = new Date(year, month, 1)
  const offset = (4 - d.getDay() + 7) % 7
  d.setDate(1 + offset)
  return d
}

// Prochaine réunion Hommes clés : 1er jeudi à venir (ce mois si futur, sinon
// mois suivant), à 11h.
export function nextHommesCles(from = new Date()) {
  const today = atMidnight(from)
  let ft = firstThursday(today.getFullYear(), today.getMonth())
  if (ft < today) ft = firstThursday(today.getFullYear(), today.getMonth() + 1)
  return ft
}

// Prochaine réunion Stratégie : prochain 1er mars ou 1er septembre à venir.
export function nextStrategie(from = new Date()) {
  const today = atMidnight(from)
  const y = today.getFullYear()
  const candidates = [
    new Date(y, 2, 1),
    new Date(y, 8, 1),
    new Date(y + 1, 2, 1),
    new Date(y + 1, 8, 1),
  ]
  return candidates.find((d) => d >= today) ?? candidates[0]
}

// Jours restants avant une date (0 = aujourd'hui).
export function daysUntil(date) {
  return Math.round((atMidnight(date) - atMidnight(new Date())) / 86400000)
}

// Date longue en français, ex. « jeudi 6 août 2026 ».
export function formatLong(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// AAAA-MM-JJ local d'une Date.
export function toIso(date) {
  const d = new Date(date)
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}

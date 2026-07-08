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

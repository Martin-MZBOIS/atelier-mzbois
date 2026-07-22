// Format date FR court (jj/mm/aaaa) ; '—' si vide/invalide.
export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR')
}

// Format date + heure FR (jj/mm/aaaa hh:mm) ; '—' si vide/invalide.
export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Ancienneté « X ans et Y mois » à partir de la date d'entrée ; '' si vide.
export function calcAnciennete(dateEntree) {
  if (!dateEntree) return ''
  const d = new Date(dateEntree)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  let mois = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
  if (now.getDate() < d.getDate()) mois -= 1
  if (mois < 0) return ''
  const ans = Math.floor(mois / 12)
  const restMois = mois % 12
  const pAns = ans > 0 ? `${ans} an${ans > 1 ? 's' : ''}` : ''
  const pMois = restMois > 0 ? `${restMois} mois` : ''
  if (pAns && pMois) return `${pAns} et ${pMois}`
  return pAns || pMois || 'moins d’un mois'
}

// Format montant € (sans décimales) ; null si vide.
export function formatEuro(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  if (Number.isNaN(n)) return null
  return n.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
}

// Numéro de semaine ISO 8601 : la semaine 1 est celle qui contient le premier
// jeudi de l'année. C'est la convention utilisée dans le bâtiment (« S30 »).
export function numeroSemaine(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const jour = t.getUTCDay() || 7 // dimanche compte comme 7
  t.setUTCDate(t.getUTCDate() + 4 - jour) // on se cale sur le jeudi de la semaine
  const debut = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t - debut) / 86400000 + 1) / 7)
}

// Trois premières lettres du nom d'un client, pour les références de courrier.
// Accents retirés et ponctuation ignorée : « TF Groupe » → « TFG ».
export function initialesClient(nom) {
  return (nom ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 3)
    .toUpperCase()
}

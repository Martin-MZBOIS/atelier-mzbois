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

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

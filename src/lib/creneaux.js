// Créneaux de planning — matin / après-midi / journée.
//
// Pas de colonne dédiée : un créneau EST une plage horaire, qu'on déduit des
// champs `heure_debut` / `heure_fin` déjà présents (migration 0011). Journée =
// pas d'horaire (toute la journée). Ce choix prépare la saisie d'heures future :
// les horaires sont déjà là.
//
// Horaires entreprise : lun-jeu 07:00 → 16:30 (pause 12:30-13:30),
// vendredi 07:00 → 12:00. La bascule matin/après-midi se fait à la pause.

export const PAUSE = '12:30'

export const CRENEAUX = {
  journee: { label: 'Journée', court: 'J' },
  matin: { label: 'Matin', court: 'AM' },
  apres: { label: 'Après-midi', court: 'PM' },
}
export const CRENEAU_ORDER = ['journee', 'matin', 'apres']

// Déduit le créneau d'une affectation à partir de ses horaires.
export function creneauDe(heureDebut, heureFin) {
  const d = (heureDebut ?? '').slice(0, 5)
  const f = (heureFin ?? '').slice(0, 5)
  if (!d && !f) return 'journee'
  if (f && f <= PAUSE) return 'matin'
  if (d && d >= PAUSE) return 'apres'
  return 'journee'
}

function estVendredi(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T00:00:00')
  return !Number.isNaN(d.getTime()) && d.getDay() === 5
}

// Horaires à enregistrer pour un créneau donné, selon le jour.
// Journée → null/null (toute la journée). Le vendredi n'a pas d'après-midi.
export function heuresDe(creneau, dateStr) {
  const ven = estVendredi(dateStr)
  if (creneau === 'matin') return { debut: '07:00', fin: ven ? '12:00' : '12:30' }
  if (creneau === 'apres') {
    if (ven) return { debut: null, fin: null } // pas d'après-midi le vendredi
    return { debut: '13:30', fin: '16:30' }
  }
  return { debut: null, fin: null }
}

// L'après-midi n'existe pas le vendredi (entreprise fermée).
export function apresMidiPossible(dateStr) {
  return !estVendredi(dateStr)
}

// Un créneau occupe-t-il la moitié « matin » de la journée ?
export function couvreMatin(creneau) {
  return creneau === 'journee' || creneau === 'matin'
}
export function couvreApres(creneau) {
  return creneau === 'journee' || creneau === 'apres'
}

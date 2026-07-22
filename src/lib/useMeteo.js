import { useEffect, useState } from 'react'

// Météo locale Tarare / Lyon (open-meteo, sans clé API).
// Purement d'agrément : elle accompagne l'accueil, elle ne porte aucune
// décision — d'où un affichage compact dans l'en-tête plutôt qu'une carte.
export function useMeteo() {
  const [meteo, setMeteo] = useState(null)

  useEffect(() => {
    let active = true
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=45.89&longitude=4.39&current=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe/Paris&forecast_days=3'
    )
      .then((r) => r.json())
      .then((d) => active && setMeteo(d))
      .catch(() => active && setMeteo({ err: true }))
    return () => {
      active = false
    }
  }, [])

  return meteo
}

export function wIcon(c) {
  if (c === 0) return '☀️'
  if (c <= 3) return '⛅'
  if (c <= 48) return '🌫️'
  if (c <= 67) return '🌧️'
  if (c <= 77) return '❄️'
  if (c <= 82) return '🌦️'
  return '⛈️'
}

export function wLabel(c) {
  if (c === 0) return 'Ensoleillé'
  if (c <= 3) return 'Nuageux'
  if (c <= 48) return 'Brouillard'
  if (c <= 67) return 'Pluvieux'
  if (c <= 77) return 'Neige'
  if (c <= 82) return 'Averses'
  return 'Orageux'
}

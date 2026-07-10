import { useEffect, useState } from 'react'

function wIcon(c) {
  if (c === 0) return '☀️'
  if (c <= 3) return '⛅'
  if (c <= 48) return '🌫️'
  if (c <= 67) return '🌧️'
  if (c <= 77) return '❄️'
  if (c <= 82) return '🌦️'
  return '⛈️'
}
function wLabel(c) {
  if (c === 0) return 'Ensoleillé'
  if (c <= 3) return 'Nuageux'
  if (c <= 48) return 'Brouillard'
  if (c <= 67) return 'Pluvieux'
  if (c <= 77) return 'Neige'
  if (c <= 82) return 'Averses'
  return 'Orageux'
}

// Météo locale Tarare / Lyon (open-meteo, sans clé API).
export default function MeteoCard() {
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

  return (
    <div className="meteo-card">
      {!meteo ? (
        <div className="meteo-loading">Chargement météo…</div>
      ) : meteo.err ? (
        <div className="meteo-loading">Météo indisponible</div>
      ) : (
        <div className="meteo-inner">
          <div>
            <div className="meteo-loc">📍 Tarare / Lyon</div>
            <div className="meteo-temp">{Math.round(meteo.current.temperature_2m)}°C</div>
            <div className="meteo-desc">
              {wIcon(meteo.current.weathercode)} {wLabel(meteo.current.weathercode)}
            </div>
          </div>
          <div className="meteo-days">
            {['Auj.', 'Dem.', 'J+2'].map((lbl, i) => (
              <div key={i} className="meteo-day">
                <div className="meteo-day-lbl">{lbl}</div>
                <div className="meteo-day-ico">{wIcon(meteo.daily.weathercode[i])}</div>
                <div className="meteo-day-max">{Math.round(meteo.daily.temperature_2m_max[i])}°</div>
                <div className="meteo-day-min">{Math.round(meteo.daily.temperature_2m_min[i])}°</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

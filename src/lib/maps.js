// Adresse de départ par défaut : l'atelier MZ Bois.
export const MZ_BOIS_ADDRESS = "1 rue de l'ennoblissement, 69170 Tarare"

// URL Google Maps d'itinéraire depuis MZ Bois vers une adresse/destination.
export function mapsDirectionsUrl(destination, origin = MZ_BOIS_ADDRESS) {
  const base = 'https://www.google.com/maps/dir/?api=1'
  return (
    base +
    '&origin=' +
    encodeURIComponent(origin) +
    '&destination=' +
    encodeURIComponent(destination)
  )
}

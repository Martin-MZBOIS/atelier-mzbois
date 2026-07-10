import { mapsDirectionsUrl } from '../lib/maps'

// Affiche une adresse cliquable : ouvre Google Maps avec l'itinéraire
// depuis l'atelier MZ Bois vers cette adresse (nouvel onglet).
export default function AddressLink({ address, origin, className }) {
  if (!address) return null
  return (
    <a
      className={'address-link' + (className ? ' ' + className : '')}
      href={mapsDirectionsUrl(address, origin)}
      target="_blank"
      rel="noopener noreferrer"
      title="Itinéraire depuis MZ Bois (Google Maps)"
    >
      {address}
      <span className="address-link-ico"> ↗</span>
    </a>
  )
}

// Icônes outline (style Tabler) — tracés stroke cohérents avec la charte MZ Bois.
const PATHS = {
  dashboard: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  building: (
    <>
      <path d="M4 20h16" />
      <path d="M6 20V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v14" />
      <path d="M14 9h3a1 1 0 0 1 1 1v10" />
      <path d="M9 8h1M9 11h1M9 14h1" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="19" r="1.4" />
      <circle cx="17" cy="19" r="1.4" />
      <path d="M3 4h2l2 11h10l2-8H6.5" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v9H3z" />
      <path d="M14 9h4l3 3v3h-7z" />
      <circle cx="7.5" cy="17.5" r="1.6" />
      <circle cx="17.5" cy="17.5" r="1.6" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="1.5" />
      <path d="M4 9h16M8 3v4M16 3v4" />
    </>
  ),
  checklist: (
    <>
      <path d="M4 6l1.5 1.5L8 5" />
      <path d="M4 13l1.5 1.5L8 12" />
      <path d="M4 20l1.5 1.5L8 19" />
      <path d="M11 6h9M11 13h9M11 20h9" />
    </>
  ),
  clipboard: (
    <>
      <rect x="6" y="5" width="12" height="16" rx="1.5" />
      <path d="M9 5a3 3 0 0 1 6 0" />
      <path d="M9 11h6M9 15h4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M4 20a5 5 0 0 1 10 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.5" />
      <path d="M17 14.5a5 5 0 0 1 3 5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v16h16" />
      <path d="M8 15l3-4 3 2 4-6" />
    </>
  ),
  book: (
    <>
      <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" />
      <path d="M5 18a2 2 0 0 1 2-2h11" />
      <path d="M9 8h5" />
    </>
  ),
  contact: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="12" cy="10" r="2.2" />
      <path d="M8.5 17a3.5 3.5 0 0 1 7 0" />
      <path d="M4 8h1M4 12h1M4 16h1" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3" />
      <path d="M12 16.5h.01" />
    </>
  ),
  logout: (
    <>
      <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
      <path d="M10 12h10M17 9l3 3-3 3" />
    </>
  ),
}

export default function Icon({ name, size = 18, className = '' }) {
  const p = PATHS[name]
  if (!p) return null
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {p}
    </svg>
  )
}

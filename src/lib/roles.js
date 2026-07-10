// Rôles applicatifs — libellés et icônes repris de la maquette MZ Bois.
export const ROLES = {
  dir: { key: 'dir', label: 'Dirigeant', short: 'DIR', icon: '◈' },
  be: { key: 'be', label: 'Resp. BE', short: 'BE', icon: '✏' },
  prog: { key: 'prog', label: 'Programmeur', short: 'PROG', icon: '⌨' },
  prod: { key: 'prod', label: 'Resp. Prod', short: 'PROD', icon: '⚙' },
  ca: { key: 'ca', label: "Chargé d'affaire", short: 'CA', icon: '📐' },
  admin: { key: 'admin', label: 'Admin', short: 'ADMIN', icon: '🗂' },
}

export const ROLE_ORDER = ['dir', 'be', 'prog', 'prod', 'ca', 'admin']

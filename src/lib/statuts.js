// =============================================================================
// Table de correspondance slug (enum SQL) ↔ libellé (maquette) + couleurs.
// Les slugs correspondent aux enums Postgres définis dans supabase/schema.sql.
// =============================================================================

// --- statut_ouvrage ---------------------------------------------------------
export const STATUT_OUVRAGE = {
  a_faire_be: { label: 'À faire BE', cls: 'st-af', color: '#6b5e58' },
  en_attente: { label: 'En attente', cls: 'st-at', color: '#8a7040' },
  validation_client: { label: 'Validation client', cls: 'st-vc', color: '#4a6b8a' },
  prog_a_faire: { label: 'Prog à faire', cls: 'st-pr', color: '#3d7a7a' },
  pret_a_fabriquer: { label: 'Prêt à fabriquer', cls: 'st-pf', color: '#6b5a8a' },
  fabrication: { label: 'Fabrication', cls: 'st-fa', color: '#7a5a30' },
  termine: { label: 'Terminé', cls: 'st-te', color: '#5a7a5a' },
  facture: { label: 'Facturé', cls: 'st-fc', color: '#8b3a3a' },
}
export const STATUT_OUVRAGE_ORDER = [
  'a_faire_be',
  'en_attente',
  'validation_client',
  'prog_a_faire',
  'pret_a_fabriquer',
  'fabrication',
  'termine',
  'facture',
]

// Regroupement des 8 statuts d'ouvrage en 3 phases visuelles (P4-4C).
// Le badge affiche la phase (couleur), le statut précis reste en tooltip.
export const PHASE_OUVRAGE = {
  etude: { label: 'Étude', color: '#4a6b8a' },
  fabrication: { label: 'Fabrication', color: '#7a5a30' },
  termine: { label: 'Terminé', color: '#5a7a5a' },
}
const STATUT_TO_PHASE = {
  a_faire_be: 'etude',
  en_attente: 'etude',
  validation_client: 'etude',
  prog_a_faire: 'etude',
  pret_a_fabriquer: 'fabrication',
  fabrication: 'fabrication',
  termine: 'termine',
  facture: 'termine',
}
// Renvoie la phase { label, color } d'un statut d'ouvrage.
export function ouvragePhase(slug) {
  return PHASE_OUVRAGE[STATUT_TO_PHASE[slug]] ?? { label: '—', color: '#cec6be' }
}

// --- statut_achat -----------------------------------------------------------
export const STATUT_ACHAT = {
  a_traiter: { label: 'À traiter', color: '#6b5e58' },
  en_stock: { label: 'En stock', color: '#5a7a5a' },
  a_commander: { label: 'À commander', color: '#8a7040' },
  en_cours_livraison: { label: 'En cours de livraison', color: '#4a6b8a' },
  recu: { label: 'Reçu', color: '#5a7a5a' },
  recu_partiellement: { label: 'Reçu partiellement', color: '#8a7040' },
  non_conforme: { label: 'Non conforme', color: '#8b3a3a' },
}

// --- typ_achat --------------------------------------------------------------
export const TYP_ACHAT = {
  panneau: { label: 'Panneau', cls: 'typ-pan' },
  strat: { label: 'Strat', cls: 'typ-str' },
  chants: { label: 'Chants', cls: 'typ-cha' },
  quincaillerie: { label: 'Quincaillerie', cls: 'typ-qui' },
  sous_traitance: { label: 'Sous-traitance', cls: 'typ-sst' },
  divers: { label: 'Divers', cls: 'typ-div' },
}
export const TYP_ACHAT_ORDER = [
  'panneau',
  'strat',
  'chants',
  'quincaillerie',
  'sous_traitance',
  'divers',
]

export const STATUT_ACHAT_ORDER = [
  'a_traiter',
  'en_stock',
  'a_commander',
  'en_cours_livraison',
  'recu',
  'recu_partiellement',
  'non_conforme',
]

// --- statut_course ----------------------------------------------------------
export const STATUT_COURSE = {
  programmee: { label: 'Programmée', color: '#4a6b8a' },
  urgente: { label: 'Urgente', color: '#8b3a3a' },
  en_cours: { label: 'En cours', color: '#8a7040' },
  faite: { label: 'Faite', color: '#5a7a5a' },
  annulee: { label: 'Annulée', color: '#6b5e58' },
}

export const STATUT_COURSE_ORDER = [
  'programmee',
  'urgente',
  'en_cours',
  'faite',
  'annulee',
]

// --- statut_feedback --------------------------------------------------------
export const STATUT_FEEDBACK = {
  remonte: { label: 'Remonté', color: '#8b3a3a', cls: 'fbo' },
  en_cours: { label: 'En cours', color: '#8a7040', cls: 'fbp' },
  resolu: { label: 'Résolu', color: '#5a7a5a', cls: 'fbd' },
}
export const STATUT_FEEDBACK_ORDER = ['remonte', 'en_cours', 'resolu']

// --- statut_reunion ---------------------------------------------------------
export const STATUT_REUNION = {
  on_track: { label: 'On track', color: '#5a7a5a' },
  attention: { label: 'Attention', color: '#8a7040' },
  bloque: { label: 'Bloqué', color: '#8b3a3a' },
}
export const STATUT_REUNION_ORDER = ['on_track', 'attention', 'bloque']

// --- phase_planning ---------------------------------------------------------
export const PHASE_PLANNING = {
  etude: { label: 'Étude' },
  fabrication: { label: 'Fabrication' },
  pose: { label: 'Pose' },
}

// --- type_societe -----------------------------------------------------------
export const TYPE_SOCIETE = {
  fournisseur: { label: 'Fournisseur', color: '#8a7040' },
  client: { label: 'Client', color: '#4a6b8a' },
  sous_traitant: { label: 'Sous-traitant', color: '#6b5a8a' },
  transporteur: { label: 'Transporteur', color: '#5a7a5a' },
}

// Résout un slug dans une table donnée, avec repli sûr.
export function resolve(table, slug) {
  return (
    table[slug] ?? { label: slug ?? '—', color: '#cec6be', cls: 'st-none' }
  )
}

// Acheminement d'un ouvrage — le type de livraison commande la suite :
// `camion` = on choisit un véhicule, `transporteur` = on désigne la société.
export const TYPE_LIVRAISON = {
  enlevement_client: { label: 'Enlèvement client', camion: false, transporteur: false },
  livraison_interne: { label: 'Livraison interne', camion: true, transporteur: false },
  livraison_externe: { label: 'Livraison externe', camion: true, transporteur: true },
  messagerie: { label: 'Messagerie', camion: false, transporteur: true },
}
export const TYPE_LIVRAISON_ORDER = [
  'enlevement_client',
  'livraison_interne',
  'livraison_externe',
  'messagerie',
]

import { supabase } from './supabase'

// Journalise une modification (best-effort) dans historique_modifications.
// Utilisé pour tracer les éditions faites par un Admin (situation %, facturation,
// coût course, imputation chantier…). Ignoré silencieusement si la table 0020
// n'existe pas encore.
export async function logModif({ table, champ, ancienne, nouvelle, chantierId, user }) {
  try {
    await supabase.from('historique_modifications').insert({
      table_name: table,
      champ,
      ancienne_valeur: ancienne == null ? null : String(ancienne),
      nouvelle_valeur: nouvelle == null ? null : String(nouvelle),
      chantier_id: chantierId ?? null,
      modifie_par: user?.id ?? null,
    })
  } catch {
    // table absente ou insertion impossible : on n'interrompt pas l'édition
  }
}

// Journalise plusieurs champs d'un coup (compare ancien/nouveau, ignore inchangés).
export async function logModifs(changes, { table, chantierId, user }) {
  for (const [champ, [ancienne, nouvelle]] of Object.entries(changes)) {
    if (String(ancienne ?? '') !== String(nouvelle ?? '')) {
      await logModif({ table, champ, ancienne, nouvelle, chantierId, user })
    }
  }
}

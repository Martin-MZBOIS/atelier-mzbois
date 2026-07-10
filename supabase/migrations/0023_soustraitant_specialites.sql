-- =============================================================================
-- Migration 0023 — spécialités des sous-traitants (P7).
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

-- Table de liaison : une ligne par (sous-traitant, spécialité).
create table if not exists soustraitant_specialites (
  id             uuid primary key default gen_random_uuid(),
  fournisseur_id uuid not null references fournisseurs (id) on delete cascade,
  specialite     text not null,
  unique (fournisseur_id, specialite)
);

create index if not exists idx_sts_fournisseur
  on soustraitant_specialites (fournisseur_id);

comment on table soustraitant_specialites is
  'Etiquettes/specialites des sous-traitants (metallier, tapissier, ...)';

-- Liste des spécialités disponibles, paramétrable depuis Paramètres.
alter table parametres
  add column if not exists specialites text[] not null
  default '{Métallier,Tapissier,Peintre,Menuisier,Poseur,Miroitier,"Transformateur plastique"}';

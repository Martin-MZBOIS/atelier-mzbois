-- =============================================================================
-- Migration 0022 — coût HT et chantier d'imputation d'une course (rôle Admin).
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

alter table courses add column if not exists cout_ht numeric(12, 2);
alter table courses add column if not exists chantier_impute_id uuid references chantiers(id) on delete set null;

comment on column courses.cout_ht is 'Coût HT de la course (saisi par Admin)';
comment on column courses.chantier_impute_id is 'Chantier imputé (peut différer du chantier lié)';

-- =============================================================================
-- Migration 0004 — données analytiques par chantier (heures + fournitures).
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

alter table chantiers
  add column if not exists heures_vendues numeric(12, 2) not null default 0;
alter table chantiers
  add column if not exists heures_realisees numeric(12, 2) not null default 0;
alter table chantiers
  add column if not exists fournitures_vendues numeric(12, 2) not null default 0;

comment on column chantiers.heures_vendues is 'Heures vendues (devis)';
comment on column chantiers.heures_realisees is 'Heures réalisées (pointage / import ProGbat)';
comment on column chantiers.fournitures_vendues is 'Fournitures vendues au client (€ HT)';

-- Valeurs de démonstration (seulement si encore à 0, pour ne pas écraser)
update chantiers set heures_vendues = 220, heures_realisees = 180, fournitures_vendues = 9000
  where num = '228-LEFEBVRE' and heures_vendues = 0;
update chantiers set heures_vendues = 150, heures_realisees = 95, fournitures_vendues = 6500
  where num = '291-TF2026' and heures_vendues = 0;
update chantiers set heures_vendues = 90, heures_realisees = 110, fournitures_vendues = 4000
  where num = '365-DVN' and heures_vendues = 0;

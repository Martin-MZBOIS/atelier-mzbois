-- =============================================================================
-- Migration 0011 — horaires sur les affectations de planning.
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

alter table plan_affectations add column if not exists heure_debut time;
alter table plan_affectations add column if not exists heure_fin time;

comment on column plan_affectations.heure_debut is 'Heure de début (null = toute la journée)';
comment on column plan_affectations.heure_fin is 'Heure de fin (null = toute la journée)';

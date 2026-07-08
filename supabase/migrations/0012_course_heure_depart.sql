-- =============================================================================
-- Migration 0012 — heure de départ sur les courses.
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

alter table courses add column if not exists heure_depart time;

comment on column courses.heure_depart is 'Heure de départ de la course';

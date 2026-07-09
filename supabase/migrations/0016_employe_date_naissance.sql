-- =============================================================================
-- Migration 0016 — date de naissance des salariés (ancienneté + anniversaires).
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

alter table employes add column if not exists date_naissance date;

comment on column employes.date_naissance is 'Date de naissance (alertes anniversaire dashboard)';

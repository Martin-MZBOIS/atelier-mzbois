-- =============================================================================
-- Migration 0008 — chantier spécial « STOCK » (commandes non affectées).
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

insert into chantiers (id, num, client, nom, avec_pose)
values (
  '44444444-4444-4444-4444-000000000099',
  'STOCK',
  'Interne',
  'Stock atelier — commandes non affectées',
  false
)
on conflict (id) do nothing;

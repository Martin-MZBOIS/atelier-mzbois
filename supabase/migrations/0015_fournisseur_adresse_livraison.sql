-- =============================================================================
-- Migration 0015 — adresse de livraison sur les fiches société.
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

alter table fournisseurs add column if not exists adresse_livraison text;

comment on column fournisseurs.adresse is 'Adresse du siège social';
comment on column fournisseurs.adresse_livraison is 'Adresse de livraison (si différente du siège)';

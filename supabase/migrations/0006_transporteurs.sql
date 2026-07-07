-- =============================================================================
-- Migration 0006 — sociétés de type « transporteur » (coursiers externes).
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

insert into fournisseurs (id, nom, adresse, famille, type) values
  ('33333333-3333-3333-3333-000000000016', 'Transports Rapides 69', 'ZI Est, 69800 Saint-Priest', null, 'transporteur'),
  ('33333333-3333-3333-3333-000000000017', 'Chrono Menuiserie',     '12 rue du Fret, 69100 Villeurbanne', null, 'transporteur')
on conflict (id) do nothing;

insert into contacts (id, fournisseur_id, nom, role, tel, email) values
  ('33333333-0000-0000-0000-000000000016', '33333333-3333-3333-3333-000000000016', 'Accueil Transports 69', 'Livraison', '0478556677', 'contact@transports69.fr'),
  ('33333333-0000-0000-0000-000000000017', '33333333-3333-3333-3333-000000000017', 'Chrono Menuiserie',     'Livraison', '0478889900', 'commande@chrono-menuiserie.fr')
on conflict (id) do nothing;

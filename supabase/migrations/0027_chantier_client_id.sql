-- =============================================================================
-- Migration 0027 — relier un chantier à une fiche client.
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
--
-- Contexte : `chantiers.client` est un texte libre ("Lefebvre", "DVN"…) sans
-- lien avec les fiches sociétés de type « client ». Impossible donc de
-- retrouver l'email du client pour lui écrire (demande de validation d'un
-- ouvrage, par exemple).
--
-- On ajoute une vraie référence. La colonne `client` est conservée : elle
-- reste le libellé affiché partout (listes, fiches) et sert de repli pour les
-- chantiers non encore reliés.
-- =============================================================================

alter table chantiers
  add column if not exists client_id uuid references fournisseurs (id) on delete set null;

comment on column chantiers.client_id is
  'Fiche societe (type client) rattachee au chantier — source de l''email client';

create index if not exists idx_chantiers_client on chantiers (client_id);

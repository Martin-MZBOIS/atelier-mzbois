-- =============================================================================
-- Migration 0002 — typage des sociétés (Fournisseur / Client / Sous-traitant /
-- Transporteur) et renommage categorie -> famille (famille produit).
-- À exécuter dans le SQL Editor de Supabase sur une base déjà initialisée.
-- Idempotent. Après exécution, penser à recharger le cache PostgREST :
--   NOTIFY pgrst, 'reload schema';
-- =============================================================================

-- Enum du type de société
do $$
begin
  if not exists (select 1 from pg_type where typname = 'type_societe') then
    create type type_societe as enum (
      'fournisseur', 'client', 'sous_traitant', 'transporteur'
    );
  end if;
end
$$;

-- Renommage categorie -> famille (garde si déjà fait)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'fournisseurs' and column_name = 'categorie'
  ) then
    alter table fournisseurs rename column categorie to famille;
  end if;
end
$$;

-- Colonne type (les lignes existantes deviennent 'fournisseur' par défaut)
alter table fournisseurs
  add column if not exists type type_societe not null default 'fournisseur';

create index if not exists idx_fournisseurs_type on fournisseurs (type);

comment on column fournisseurs.type is 'Type de société (fournisseur/client/sous_traitant/transporteur)';
comment on column fournisseurs.famille is 'Famille produit (panneaux, quincaillerie…)';

-- Données de démonstration : clients + sous-traitants
insert into fournisseurs (id, nom, adresse, famille, type) values
  ('33333333-3333-3333-3333-000000000011', 'Maison Lefebvre',   '18 chemin des Vignes, 69170 Tarare',  null,          'client'),
  ('33333333-3333-3333-3333-000000000012', 'TF Groupe',         '4 rue de l''Industrie, 69200 Vénissieux', null,       'client'),
  ('33333333-3333-3333-3333-000000000013', 'DVN Agencement',    '25 av. du Commerce, 69003 Lyon',      null,          'client'),
  ('33333333-3333-3333-3333-000000000014', 'A2 Metal',          'Les Jacquins, 42590 Neulise',         'Métallerie',  'sous_traitant'),
  ('33333333-3333-3333-3333-000000000015', 'Laquage Pro',       'ZA des Sables, 69170 Tarare',         'Laquage',     'sous_traitant')
on conflict (id) do nothing;

insert into contacts (id, fournisseur_id, nom, role, tel, email) values
  ('33333333-0000-0000-0000-000000000011', '33333333-3333-3333-3333-000000000011', 'Julien Lefebvre',  'Client',     '0611002011', 'j.lefebvre@email.fr'),
  ('33333333-0000-0000-0000-000000000012', '33333333-3333-3333-3333-000000000014', 'Pierre Favre',     'Dirigeant',  '0477654321', 'contact@a2metal.fr'),
  ('33333333-0000-0000-0000-000000000013', '33333333-3333-3333-3333-000000000015', 'Sandra Meunier',   'Commande',   '0478223344', 'contact@laquagepro.fr')
on conflict (id) do nothing;

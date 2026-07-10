-- =============================================================================
-- Migration 0024 — refonte COPIL (P10) : trames paramétrables, ordres du jour
-- publiables et comptes-rendus structurés.
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
--
-- NB : coexiste avec le schéma 0014 (copil_sujets / copil_reunions /
-- copil_actions) déjà utilisé ; ces tables enrichissent le flux.
-- =============================================================================

-- Trames de réunion éditables par le Dirigeant (une par type de réunion).
create table if not exists copil_trames (
  id         uuid primary key default gen_random_uuid(),
  type       text not null unique,          -- reunion_chantiers | hommes_cles | strategie
  sections   jsonb not null default '[]'::jsonb,
  modifie_le timestamptz not null default now()
);

-- Ordre du jour publiable.
create table if not exists copil_odj (
  id            uuid primary key default gen_random_uuid(),
  reunion_type  text not null,
  date_reunion  date,
  sujets        jsonb not null default '[]'::jsonb,
  publie        boolean not null default false,
  publie_le     timestamptz
);

-- Compte-rendu structuré (réunion en cours / clôturée).
create table if not exists copil_cr (
  id            uuid primary key default gen_random_uuid(),
  reunion_type  text not null,
  date          date,
  trame         jsonb not null default '[]'::jsonb,
  notes         text,
  statut        text not null default 'en_cours',  -- en_cours | cloture
  cree_le       timestamptz not null default now()
);

-- Actions d'un compte-rendu (génèrent des tâches à la clôture).
create table if not exists copil_cr_actions (
  id        uuid primary key default gen_random_uuid(),
  cr_id     uuid not null references copil_cr (id) on delete cascade,
  texte     text not null,
  assigne_a uuid references employes (id) on delete set null,
  done      boolean not null default false
);

create index if not exists idx_copil_odj_type on copil_odj (reunion_type);
create index if not exists idx_copil_cr_type on copil_cr (reunion_type);
create index if not exists idx_copil_cr_actions_cr on copil_cr_actions (cr_id);

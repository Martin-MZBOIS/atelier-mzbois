-- =============================================================================
-- Migration 0014 — COPIL (réunions de chantiers / hommes clés / stratégie).
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'copil_type') then
    create type copil_type as enum ('chantiers', 'hommes_cles', 'strategie');
  end if;
  if not exists (select 1 from pg_type where typname = 'copil_reunion_statut') then
    create type copil_reunion_statut as enum ('planifiee', 'faite');
  end if;
  if not exists (select 1 from pg_type where typname = 'copil_sujet_statut') then
    create type copil_sujet_statut as enum ('boite', 'ordre_du_jour', 'traite');
  end if;
end
$$;

-- Réunions COPIL (hommes clés / stratégie ; l'onglet chantiers agrège les
-- réunions par chantier de la table reunions).
create table if not exists copil_reunions (
  id            uuid primary key default gen_random_uuid(),
  type          copil_type not null,
  date          date,
  heure         time,
  ordre_du_jour text,
  notes         text,
  statut        copil_reunion_statut not null default 'planifiee',
  created_at    timestamptz not null default now()
);

-- Boîte à idées / sujets
create table if not exists copil_sujets (
  id          uuid primary key default gen_random_uuid(),
  type        copil_type not null,
  titre       text not null,
  description text,
  soumis_par  uuid references utilisateurs (id) on delete set null,
  date        date not null default current_date,
  statut      copil_sujet_statut not null default 'boite'
);

-- Actions d'une réunion COPIL
create table if not exists copil_actions (
  id         uuid primary key default gen_random_uuid(),
  reunion_id uuid not null references copil_reunions (id) on delete cascade,
  texte      text not null,
  assigne_a  uuid references employes (id) on delete set null,
  done       boolean not null default false
);

create index if not exists idx_copil_reunions_type on copil_reunions (type);
create index if not exists idx_copil_sujets_type on copil_sujets (type);
create index if not exists idx_copil_actions_reunion on copil_actions (reunion_id);

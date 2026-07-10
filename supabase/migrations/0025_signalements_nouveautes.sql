-- =============================================================================
-- Migration 0025 — refonte Assistance (P12) : signalements + nouveautés.
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

-- Signalements (problème / idée d'amélioration) remontés par les utilisateurs.
create table if not exists signalements (
  id          uuid primary key default gen_random_uuid(),
  type        text not null default 'probleme',   -- probleme | idee
  description text not null,
  capture_url text,
  soumis_par  uuid references utilisateurs (id) on delete set null,
  date        timestamptz not null default now(),
  statut      text not null default 'en_attente',  -- en_attente | traite
  reponse     text
);

create index if not exists idx_signalements_soumis_par on signalements (soumis_par);

comment on table signalements is
  'Signalements Assistance : problemes et idees d''amelioration.';

-- Journal des nouveautés de l'application (changelog).
create table if not exists app_nouveautes (
  id            uuid primary key default gen_random_uuid(),
  date          date not null default current_date,
  titre         text not null,
  description   text,
  visible_roles text[]        -- null = visible par tous les rôles
);

create index if not exists idx_app_nouveautes_date on app_nouveautes (date desc);

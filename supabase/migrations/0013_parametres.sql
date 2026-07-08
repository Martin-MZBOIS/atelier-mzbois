-- =============================================================================
-- Migration 0013 — table de paramètres (config globale, ligne unique).
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

create table if not exists parametres (
  id            int primary key default 1,
  cout_horaire  numeric(12, 2) not null default 45,
  alerte_orange int not null default 3,
  alerte_rouge  int not null default 7,
  unites        text[] not null default '{panneau,ml,m²,pièce,rouleau}',
  droits        jsonb not null default '{}'::jsonb,
  constraint parametres_singleton check (id = 1)
);

comment on table parametres is 'Configuration globale de l''application (ligne unique id=1)';

insert into parametres (id) values (1) on conflict (id) do nothing;

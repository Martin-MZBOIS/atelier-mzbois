-- =============================================================================
-- Migration 0017 — messages d'assistance (questions / suggestions au Dirigeant).
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'assistance_type') then
    create type assistance_type as enum ('question', 'suggestion');
  end if;
end$$;

create table if not exists assistance_messages (
  id        uuid primary key default gen_random_uuid(),
  type      assistance_type not null,
  texte     text not null,
  categorie text,                       -- pour les questions : Chantiers / Achats / Planning / Courses / Autre
  auteur_id uuid references utilisateurs(id) on delete set null,
  lu        boolean not null default false,
  cree_le   timestamptz not null default now()
);

create index if not exists idx_assistance_messages_lu on assistance_messages(lu);

-- =============================================================================
-- Migration 0001 — réponses en fil pour fil_messages
-- À exécuter dans le SQL Editor de Supabase sur une base déjà initialisée
-- (schema.sql d'origine). Idempotent.
-- =============================================================================

alter table fil_messages
  add column if not exists parent_id uuid
    references fil_messages (id) on delete cascade;

comment on column fil_messages.parent_id is
  'Message parent si réponse en fil (null = message racine)';

create index if not exists idx_fil_parent on fil_messages (parent_id);

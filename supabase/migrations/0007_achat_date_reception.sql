-- =============================================================================
-- Migration 0007 — date de réception sur les achats.
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

alter table achats add column if not exists date_reception date;

comment on column achats.date_reception is 'Date de réception de l''achat';

-- Démo : la ligne « reçue » du seed reçoit une date de réception
update achats set date_reception = '2026-08-25'
  where nom = 'Chants ABS chêne' and date_reception is null;

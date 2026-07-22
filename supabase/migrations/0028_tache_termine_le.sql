-- =============================================================================
-- Migration 0028 — date de réalisation d'une tâche.
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
--
-- `done` était un simple booléen : en cochant une tâche, l'application
-- oubliait aussitôt QUAND elle avait été faite. L'onglet « Terminées »
-- affichait donc une liste sans repère temporel, et aucun historique
-- exploitable n'était possible.
--
-- On horodate désormais la réalisation. Les tâches déjà terminées avant cette
-- migration gardent `termine_le` à null : l'information n'a jamais existé, on
-- ne l'invente pas — l'écran affichera « date inconnue ».
-- =============================================================================

alter table taches
  add column if not exists termine_le timestamptz;

comment on column taches.termine_le is
  'Horodatage du passage a done = true (null si jamais terminee, ou terminee avant la migration 0028)';

create index if not exists idx_taches_termine_le on taches (termine_le desc);

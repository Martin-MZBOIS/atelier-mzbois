-- =============================================================================
-- Migration 0019 — nouveaux rôles « Chargé d'affaire » (ca) et « Admin » (admin).
-- À exécuter AVANT 0020 (Postgres interdit l'usage d'une valeur d'enum
-- nouvellement ajoutée dans la même transaction que sa création).
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

alter type user_role add value if not exists 'ca';
alter type user_role add value if not exists 'admin';

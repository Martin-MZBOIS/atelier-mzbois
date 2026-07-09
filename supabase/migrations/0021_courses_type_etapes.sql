-- =============================================================================
-- Migration 0021 — type de course, étapes de tournée, ouvrages liés, libellés lieux.
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

-- Type de course : livraison (départ MZ Bois), ramasse (arrivée MZ Bois), tournée (multi-étapes).
alter table courses add column if not exists type_course text not null default 'livraison';

-- Étapes d'une tournée : tableau JSON [{ label, ouvrage_id }] ordonné.
alter table courses add column if not exists etapes jsonb;

-- Ouvrages liés à la course (multi-sélection).
alter table courses add column if not exists ouvrage_ids uuid[];

-- Libellés lieux (permettent « MZ Bois » et les entités hors table dédiée).
alter table courses add column if not exists de_libelle text;
alter table courses add column if not exists vers_libelle text;

comment on column courses.type_course is 'livraison | ramasse | tournee';
comment on column courses.etapes is 'Tournée : [{ label, ouvrage_id }] ordonné';
comment on column courses.ouvrage_ids is 'Ouvrages liés à la course';
comment on column courses.de_libelle is 'Libellé du lieu de départ (ex : MZ Bois)';
comment on column courses.vers_libelle is 'Libellé du lieu d''arrivée (ex : MZ Bois)';

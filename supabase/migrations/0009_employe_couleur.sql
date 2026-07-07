-- =============================================================================
-- Migration 0009 — couleur personnalisée par salarié (avatars + planning).
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

alter table employes add column if not exists couleur text;

comment on column employes.couleur is 'Couleur d''affichage (hex) — avatars + blocs planning';

-- Couleurs de démonstration (seulement si non définies)
update employes set couleur = '#4a6b8a' where prenom = 'Jonathan' and nom = 'Martin'  and couleur is null;
update employes set couleur = '#8a7040' where prenom = 'Marc'     and nom = 'Dupuis'  and couleur is null;
update employes set couleur = '#846a57' where prenom = 'Pierre'   and nom = 'Bernard' and couleur is null;
update employes set couleur = '#5a7a5a' where prenom = 'Thomas'   and nom = 'Petit'   and couleur is null;
update employes set couleur = '#8b3a3a' where prenom = 'Nicolas'  and nom = 'Moreau'  and couleur is null;
update employes set couleur = '#6b5a8a' where prenom = 'Julien'   and nom = 'Girard'  and couleur is null;
update employes set couleur = '#3d7a7a' where prenom = 'Kevin'    and nom = 'Roux'    and couleur is null;
update employes set couleur = '#b5651d' where prenom = 'Antoine'  and nom = 'Faure'   and couleur is null;

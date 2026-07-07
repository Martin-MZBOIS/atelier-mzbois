-- =============================================================================
-- Migration 0010 — site web sur les fiches société.
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

alter table fournisseurs add column if not exists site_web text;

comment on column fournisseurs.site_web is 'Site web (URL)';

-- Quelques sites de démo (seulement si non définis)
update fournisseurs set site_web = 'https://www.dispano.fr'  where nom = 'DISPANO'    and site_web is null;
update fournisseurs set site_web = 'https://www.wurth.fr'    where nom = 'Würth Pro'  and site_web is null;
update fournisseurs set site_web = 'https://www.hafele.fr'   where nom = 'HÄFELE'     and site_web is null;
update fournisseurs set site_web = 'https://www.egger.com'   where nom = 'EGGER'      and site_web is null;
update fournisseurs set site_web = 'https://www.blum.com'    where nom = 'BLUM France' and site_web is null;

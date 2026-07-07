-- =============================================================================
-- Migration 0005 — ouvrages.devis : montant numérique -> N° de devis (texte).
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

-- Type texte (no-op si déjà texte)
alter table ouvrages alter column devis type text using devis::text;

comment on column ouvrages.devis is 'N° de devis (référence, ex : DEV-001)';

-- Conversion des valeurs de démo (uniquement si encore numériques)
update ouvrages set devis = 'DEV-228-01' where nom = 'Cuisine sur mesure'     and devis ~ '^[0-9]';
update ouvrages set devis = 'DEV-228-02' where nom = 'Dressing chambre'        and devis ~ '^[0-9]';
update ouvrages set devis = 'DEV-291-01' where nom = 'Banque d''accueil'       and devis ~ '^[0-9]';
update ouvrages set devis = 'DEV-291-02' where nom = 'Habillage mural'         and devis ~ '^[0-9]';
update ouvrages set devis = 'DEV-365-01' where nom = 'Meubles salle de bain'   and devis ~ '^[0-9]';
update ouvrages set devis = 'DEV-365-02' where nom = 'Placards entrée'         and devis ~ '^[0-9]';

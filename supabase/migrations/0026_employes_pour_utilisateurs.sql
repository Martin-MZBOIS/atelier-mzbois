-- =============================================================================
-- Migration 0026 — une fiche `employes` pour chaque utilisateur de l'app.
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
--
-- Contexte : les tâches (`taches.assigne_a`) et les actions de réunion
-- référencent `employes`, alors que la connexion s'appuie sur `utilisateurs`.
-- Le lien entre les deux se fait par l'email. Sans fiche employé, un
-- utilisateur ne peut recevoir aucune tâche : le bloc « Mes tâches » de son
-- tableau de bord resterait vide en permanence.
--
-- Ici on crée les fiches manquantes (Dirigeant, Chargé d'affaire, Admin) ;
-- BE, Programmeur et Resp. Prod en ont déjà une.
-- =============================================================================

insert into employes (prenom, nom, role, email)
select u.prenom,
       u.nom,
       case u.role
         when 'dir'   then 'Dirigeant'
         when 'be'    then 'BE'
         when 'prog'  then 'Prog'
         when 'prod'  then 'Chef'
         when 'ca'    then 'Chargé d''affaire'
         when 'admin' then 'Admin'
         else 'Autre'
       end,
       u.email
from utilisateurs u
where u.email is not null
  and not exists (
    select 1 from employes e where e.email = u.email
  );

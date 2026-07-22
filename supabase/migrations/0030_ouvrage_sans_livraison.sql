-- Suppression de la date de livraison d'un ouvrage.
--
-- Un ouvrage portait deux dates, « départ atelier » et « livraison ». Seule la
-- première sert : elle pilote l'alerte « départs atelier sous 7 jours » du
-- Dirigeant, le tri et les seuils du Programmeur, et le numéro de semaine
-- annoncé au client dans la demande de validation. La seconde n'alimentait
-- qu'un badge d'affichage — deux dates à saisir pour une seule finalité.
--
-- Le champ a déjà disparu de l'application : cette migration ne fait que
-- nettoyer la base. Rien ne cassera si vous préférez ne pas l'exécuter.
--
-- ATTENTION : `drop column` est irréversible. Vérifiez d'abord ce que la
-- colonne contient encore :
--
--   select count(*) from ouvrages where livraison is not null;
--
-- Si des dates y subsistent et que vous voulez les garder, reportez-les sur
-- `dep` avant de lancer la suppression.

alter table ouvrages drop column if exists livraison;

notify pgrst, 'reload schema';

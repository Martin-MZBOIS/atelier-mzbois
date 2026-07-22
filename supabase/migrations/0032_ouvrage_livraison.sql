-- Mode d'acheminement d'un ouvrage.
--
-- Le transport se décrivait par un seul champ libre « camion », où chacun
-- écrivait ce qu'il voulait. On le structure en trois informations qui
-- s'enchaînent :
--
--   1. type de livraison : enlèvement client, livraison interne, livraison
--      externe ou messagerie ;
--   2. type de camion : la colonne `camion` existante, désormais choisie dans
--      une liste tenue en Paramètres plutôt que saisie à la main ;
--   3. transporteur : la fiche du transporteur, quand la livraison est confiée
--      à un tiers. On réutilise les sociétés de type « transporteur » déjà
--      enregistrées dans Contacts — celles dont se sert le module Courses.
--
-- La colonne `camion` est conservée telle quelle : les valeurs déjà saisies
-- restent lisibles, et le Dirigeant peut les reprendre dans la liste.

alter table ouvrages
  add column if not exists type_livraison text,
  add column if not exists transporteur_id uuid references fournisseurs (id) on delete set null;

create index if not exists idx_ouvrages_transporteur
  on ouvrages (transporteur_id);

comment on column ouvrages.type_livraison is
  'enlevement_client | livraison_interne | livraison_externe | messagerie';
comment on column ouvrages.transporteur_id is
  'Société de type transporteur, quand l''acheminement est confié à un tiers.';

-- Liste des véhicules disponibles, paramétrable par le Dirigeant.
alter table parametres
  add column if not exists camions text[] not null
  default '{"Camion MZ","Poids lourd","Utilitaire","20m3 hayon"}';

notify pgrst, 'reload schema';

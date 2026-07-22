-- Unicité du numéro de chantier.
--
-- Rien n'empêchait jusqu'ici de créer deux chantiers « 228 ». Le risque était
-- théorique tant que les numéros étaient longs et distincts ; avec la
-- convention à trois chiffres, un doublon devient facile — et deux chantiers
-- homonymes rendent illisibles le planning, les achats et les courses.
--
-- L'index porte sur `lower(trim(num))` : « 228 », « 228 » avec une espace en
-- trop et « Stock » ne doivent pas cohabiter avec « STOCK ».
--
-- Les numéros vides restent autorisés en plusieurs exemplaires (un chantier
-- peut être créé avant d'être numéroté), d'où l'index partiel.

-- Vérifiez d'abord qu'aucun doublon n'existe : cette requête doit ne rien
-- renvoyer, sinon la création de l'index échouera.
--
--   select lower(trim(num)) as cle, count(*), array_agg(nom)
--   from chantiers
--   where num is not null and trim(num) <> ''
--   group by 1 having count(*) > 1;

create unique index if not exists idx_chantiers_num_unique
  on chantiers (lower(trim(num)))
  where num is not null and trim(num) <> '';

notify pgrst, 'reload schema';

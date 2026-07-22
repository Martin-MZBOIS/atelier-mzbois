-- Contact référent d'un chantier.
--
-- Le chantier était rattaché à une fiche client (0027), mais l'interlocuteur
-- restait implicite : pour lui écrire, l'application prenait le premier contact
-- de la fiche qui avait un email — au hasard, donc, dès qu'une société en
-- compte plusieurs. On désigne désormais explicitement la personne.
--
-- `on delete set null` : supprimer un contact ne doit jamais faire disparaître
-- un chantier ; il redevient simplement sans interlocuteur désigné.

alter table chantiers
  add column if not exists contact_id uuid references contacts (id) on delete set null;

create index if not exists idx_chantiers_contact on chantiers (contact_id);

comment on column chantiers.contact_id is
  'Interlocuteur chez le client, choisi parmi les contacts de chantiers.client_id.';

-- Reprise de l'existant : quand la fiche client n'a qu'un seul contact avec un
-- email, il n'y a pas d'ambiguïté — on le désigne d'office. Les fiches qui en
-- comptent plusieurs sont laissées vides, le choix revient à l'utilisateur.
update chantiers c
set contact_id = seul.id
from (
  select ct.fournisseur_id, min(ct.id::text)::uuid as id
  from contacts ct
  where ct.email is not null and ct.email <> ''
  group by ct.fournisseur_id
  having count(*) = 1
) as seul
where c.client_id = seul.fournisseur_id
  and c.contact_id is null;

notify pgrst, 'reload schema';

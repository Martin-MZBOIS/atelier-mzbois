-- Ouvrage optionnel sur une affectation de planning.
--
-- Un chantier regroupe plusieurs ouvrages (cuisine, dressing, banque
-- d'accueil…). Pouvoir dire « Thomas sur le 228, ouvrage Cuisine, matin »
-- précise le planning et prépare la charge par ouvrage (les heures à produire
-- vivront à terme sur l'ouvrage).
--
-- Nullable : une affectation peut rester au niveau du chantier, sans ouvrage
-- désigné. `on delete set null` : supprimer un ouvrage ne fait pas disparaître
-- l'affectation, elle redevient simplement « chantier sans ouvrage précis ».

alter table plan_affectations
  add column if not exists ouvrage_id uuid references ouvrages (id) on delete set null;

create index if not exists idx_plan_aff_ouvrage
  on plan_affectations (ouvrage_id);

comment on column plan_affectations.ouvrage_id is
  'Ouvrage précis du chantier sur lequel porte l''affectation (optionnel).';

notify pgrst, 'reload schema';

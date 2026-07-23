-- Destinataire d'un feedback.
--
-- Un feedback avait un statut (remonté / en cours / résolu) mais aucun
-- propriétaire : personne ne le portait, et il remontait de fait au Dirigeant
-- — qui n'est pas censé le résoudre. On désigne explicitement qui doit le
-- traiter, ce qui rend enfin « en cours » signifiant : en cours PAR quelqu'un.
--
-- Le cycle devient : Remonté (sans destinataire) → Assigné à X → Résolu.
-- Le triage revient au Resp. Prod, qui route vers le BE, la programmation ou
-- l'atelier selon la nature du problème.
--
-- Référence `employes` (et non `utilisateurs`) : un feedback se traite par une
-- personne de l'atelier, pas nécessairement par un compte applicatif — même
-- choix que les tâches (taches.assigne_a).

alter table feedbacks
  add column if not exists assigne_a uuid references employes (id) on delete set null;

create index if not exists idx_feedbacks_assigne on feedbacks (assigne_a);

comment on column feedbacks.assigne_a is
  'Personne chargée de résoudre le feedback (null = pas encore trié).';

notify pgrst, 'reload schema';

# Temps réel (Supabase Realtime) — configuration

Le frontend s'abonne aux changements via `src/lib/useRealtime.js`. Pour que les
évènements soient émis, chaque table doit appartenir à la publication
`supabase_realtime`.

Ce n'est **pas** une migration de schéma : à exécuter une seule fois dans le
SQL Editor de Supabase.

## À exécuter

Ce bloc est rejouable sans risque : il n'ajoute que les tables absentes.
(Un `alter publication … add table` sur une table déjà publiée échoue, d'où le
test préalable.)

```sql
do $$
declare t text;
begin
  foreach t in array array[
    'ouvrages', 'achats', 'fil_messages', 'taches', 'plan_affectations',
    'feedbacks', 'copil_sujets', 'signalements'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
```

## Vérifier

```sql
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;
```

Les 8 tables du tableau ci-dessous doivent apparaître.

## Tables abonnées côté application

| Table               | Page(s)                                   | Effet |
|---------------------|-------------------------------------------|-------|
| `ouvrages`          | Fiche chantier → Ouvrages                 | statut mis à jour en direct |
| `achats`            | Achats (global) + fiche chantier → Achats | réception / statut en direct |
| `fil_messages`      | Fiche chantier → Fil                      | nouveaux messages en direct |
| `taches`            | Tableau de bord                           | nouvelles tâches assignées |
| `plan_affectations` | Planning                                  | affectations en direct |
| `feedbacks`         | Fiche chantier → Feedbacks                | remontées de l'atelier en direct |
| `copil_sujets`      | COPIL                                     | sujets soumis en direct |
| `signalements`      | Assistance                                | nouveaux signalements en direct |

Sans cette configuration, l'application fonctionne normalement mais sans mise à
jour automatique : il faut recharger la page pour voir les changements faits
depuis un autre poste.

## À reprendre au moment des RLS

Le temps réel respecte les règles d'accès (RLS). Deux points à traiter quand
elles seront activées :

- une table sans politique de lecture cesse d'émettre vers le client concerné ;
- les évènements `update` et `delete` ne transportent l'ancienne version de la
  ligne que si la table est en `replica identity full`. À ajouter seulement si
  un filtre côté client en dépend :

```sql
alter table public.ouvrages replica identity full;
```

# Temps réel (Supabase Realtime) — configuration

Le frontend s'abonne aux changements via `src/lib/useRealtime.js` sur les
tables critiques. Pour que les évènements soient émis, chaque table doit être
ajoutée à la publication `supabase_realtime`.

Ce n'est **pas** une migration de schéma : à exécuter une seule fois dans le
SQL Editor de Supabase (ou via Database → Replication → cocher les tables).

```sql
alter publication supabase_realtime add table public.ouvrages;
alter publication supabase_realtime add table public.achats;
alter publication supabase_realtime add table public.fil_messages;
alter publication supabase_realtime add table public.taches;
alter publication supabase_realtime add table public.plan_affectations;
```

Tables abonnées côté app :

| Table              | Page(s)                                   | Effet |
|--------------------|-------------------------------------------|-------|
| `ouvrages`         | Fiche chantier → Ouvrages                 | statut mis à jour en direct |
| `achats`           | Achats (global) + fiche chantier → Achats | réception / statut en direct |
| `fil_messages`     | Fiche chantier → Fil                      | nouveaux messages en direct |
| `taches`           | Dashboard                                 | nouvelles tâches assignées |
| `plan_affectations`| Planning                                  | affectations en direct |

Sans cette configuration, l'app fonctionne normalement mais sans mise à jour
automatique (il faut recharger / rouvrir la page).

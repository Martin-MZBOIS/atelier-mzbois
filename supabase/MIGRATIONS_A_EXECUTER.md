# Migrations à exécuter dans Supabase

À exécuter **dans l'ordre** dans le SQL Editor de Supabase, puis
`NOTIFY pgrst, 'reload schema';` (ou attendre le rechargement auto).

> ⚠️ **0019 doit être exécutée et validée AVANT 0020** : Postgres interdit
> l'usage d'une valeur d'enum (`ca`, `admin`) dans la même transaction que sa
> création. Exécute 0019 seule, puis 0020.

| Ordre | Fichier | Objet | Point |
|------|---------|-------|-------|
| 1 | `migrations/0014_copil.sql` | Tables COPIL (réunions, sujets, actions) | 17 |
| 2 | `migrations/0015_fournisseur_adresse_livraison.sql` | Colonne `adresse_livraison` (contacts) | 12 |
| 3 | `migrations/0016_employe_date_naissance.sql` | Colonne `date_naissance` (salariés) | 14 |
| 4 | `migrations/0017_assistance_messages.sql` | Table `assistance_messages` (questions/suggestions) | 13 |
| 5 | `migrations/0018_modele_articles.sql` | Table `modele_articles` (composition modèle) | 26 |
| 6 | `migrations/0019_roles_ca_admin.sql` | Enum `user_role` += `ca`, `admin` | 15/28 |
| 7 | `migrations/0020_historique_et_seed_roles.sql` | Table `historique_modifications` + profils Simon Forestier (ca) / Marie Zinopoulos (admin) | 15/28 |
| 8 | `migrations/0021_courses_type_etapes.sql` | Colonnes courses : `type_course`, `etapes`, `ouvrage_ids`, `de/vers_libelle` | 8 |
| 9 | `migrations/0022_course_cout_imputation.sql` | Colonnes courses : `cout_ht`, `chantier_impute_id` | 16 |

Toutes les migrations sont **idempotentes** (`if not exists` / `on conflict do nothing`).
En attendant leur exécution, l'application dégrade proprement (messages
« exécute la migration … » au lieu de planter).

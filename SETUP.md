# Setup — Atelier MZ Bois & Compagnie

Application React + Vite + Supabase.

## Prérequis
- Node.js (LTS) installé
- Accès au projet Supabase et au dépôt GitHub `Martin-MZBOIS/atelier-mzbois`

## Récupérer / réinstaller le projet

Si le dossier local est perdu ou vidé, tout le code est sur GitHub :

```bash
git clone https://github.com/Martin-MZBOIS/atelier-mzbois.git
cd atelier-mzbois
npm install
```

## ⚠️ Recréer le fichier `.env.local` (indispensable)

Le fichier `.env.local` contient les identifiants Supabase. Il est **ignoré par
git** (jamais poussé) — il faut donc le recréer à la main après un clone.

Crée un fichier `.env.local` à la racine du projet avec :

```
VITE_SUPABASE_URL=https://aqqarblluusizvegfzgz.supabase.co
VITE_SUPABASE_ANON_KEY=<clé publishable / anon>
```

- **VITE_SUPABASE_URL** : le « Project URL ».
- **VITE_SUPABASE_ANON_KEY** : la clé **publishable** (ou `anon` `public`) — la clé
  publique destinée au front. **Jamais** la clé `service_role`.

Où les trouver : Supabase → **Project Settings → API** (Project URL + clés).

> Sans ce fichier, l'app renvoie `supabaseUrl is required` et ne se connecte pas.

## Lancer en développement

```bash
npm run dev
```
Puis ouvrir http://localhost:5173/

## Build de production

```bash
npm run build
```

## Base de données (migrations)

Les migrations SQL sont dans `supabase/migrations/`. L'ordre d'exécution et le
détail sont dans [`supabase/MIGRATIONS_A_EXECUTER.md`](supabase/MIGRATIONS_A_EXECUTER.md).
À exécuter dans le SQL Editor de Supabase, puis `NOTIFY pgrst, 'reload schema';`.

## Connexion (mode démo)
Sur l'écran de connexion, on choisit un rôle : Dirigeant, Resp. BE, Programmeur,
Resp. PROD, Chargé d'affaire, Admin. Chaque rôle charge un utilisateur de
démonstration de la table `utilisateurs`.

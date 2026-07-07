# Atelier MZ Bois

Application React + Vite avec Supabase, React Router et Zustand.

## Prérequis

- [Node.js](https://nodejs.org/) 18+ (npm inclus)

## Installation

```bash
npm install
```

## Configuration

Renseigne tes clés Supabase dans `.env.local` :

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Démarrage

```bash
npm run dev
```

## Structure

```
src/
  components/   Composants réutilisables
  pages/        Pages / routes
  lib/
    supabase.js Client Supabase
  store/
    index.js    Store Zustand
  App.jsx       Routes de l'application
  main.jsx      Point d'entrée
```

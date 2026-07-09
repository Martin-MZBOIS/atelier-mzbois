-- =============================================================================
-- Migration 0018 — composition d'un ouvrage modèle en articles de bibliothèque.
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

create table if not exists modele_articles (
  id            uuid primary key default gen_random_uuid(),
  modele_id     uuid not null references ouvrage_modeles(id) on delete cascade,
  article_id    uuid not null references articles(id) on delete cascade,
  quantite      numeric(12, 2) not null default 1,
  statut_defaut text not null default 'a_commander', -- 'en_stock' | 'a_commander'
  unique (modele_id, article_id)
);

create index if not exists idx_modele_articles_modele on modele_articles(modele_id);

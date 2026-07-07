-- =============================================================================
-- Migration 0003 — Bibliothèques : articles + ouvrages modèles.
-- À exécuter dans le SQL Editor de Supabase sur une base déjà initialisée.
-- Idempotent. Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

-- Articles (bibliothèque d'articles réutilisables)
create table if not exists articles (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  description text,
  typ         typ_achat,
  prix        numeric(12, 2),
  unite       text
);

-- Fournisseurs d'un article (N-N)
create table if not exists article_fournisseurs (
  article_id     uuid not null references articles (id) on delete cascade,
  fournisseur_id uuid not null references fournisseurs (id) on delete cascade,
  primary key (article_id, fournisseur_id)
);

-- Ouvrages modèles (gabarits réutilisables)
create table if not exists ouvrage_modeles (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  description text,
  typs        typ_achat[] not null default '{}'
);

create index if not exists idx_articles_typ on articles (typ);
create index if not exists idx_article_fournisseurs_fournisseur
  on article_fournisseurs (fournisseur_id);

-- Données de démonstration --------------------------------------------------
insert into articles (id, nom, description, typ, prix, unite) values
  ('a1a1a1a1-a1a1-a1a1-a1a1-000000000001', 'MDF 2800x2070x16',   'MDF standard 16mm',   'panneau',       45.00, 'panneau'),
  ('a1a1a1a1-a1a1-a1a1-a1a1-000000000002', 'Mélaminé Egger W980','Mélaminé blanc 19mm', 'panneau',       62.00, 'panneau'),
  ('a1a1a1a1-a1a1-a1a1-a1a1-000000000003', 'Chant PVC 1mm ABS',  'Chant de finition',   'chants',        12.00, 'rouleau'),
  ('a1a1a1a1-a1a1-a1a1-a1a1-000000000004', 'Poignées inox',      'Inox brossé standard','quincaillerie',  8.50, 'pièce')
on conflict (id) do nothing;

insert into article_fournisseurs (article_id, fournisseur_id) values
  ('a1a1a1a1-a1a1-a1a1-a1a1-000000000001', '33333333-3333-3333-3333-000000000002'), -- MDF / DISPANO
  ('a1a1a1a1-a1a1-a1a1-a1a1-000000000001', '33333333-3333-3333-3333-000000000009'), -- MDF / PANOFRANCE
  ('a1a1a1a1-a1a1-a1a1-a1a1-000000000002', '33333333-3333-3333-3333-000000000010'), -- Mélaminé / EGGER
  ('a1a1a1a1-a1a1-a1a1-a1a1-000000000003', '33333333-3333-3333-3333-000000000003'), -- Chant / Würth Pro
  ('a1a1a1a1-a1a1-a1a1-a1a1-000000000004', '33333333-3333-3333-3333-000000000006')  -- Poignées / HÄFELE
on conflict do nothing;

insert into ouvrage_modeles (id, nom, description, typs) values
  ('a2a2a2a2-a2a2-a2a2-a2a2-000000000001', 'Banque d''accueil',   'Avec plan de travail et rangements', '{panneau,chants,quincaillerie}'),
  ('a2a2a2a2-a2a2-a2a2-a2a2-000000000002', 'Bibliothèque murale', 'Avec niches et portes',              '{panneau,strat,chants}')
on conflict (id) do nothing;

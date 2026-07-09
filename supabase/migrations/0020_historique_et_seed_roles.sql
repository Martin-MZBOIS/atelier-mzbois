-- =============================================================================
-- Migration 0020 — traçabilité des modifications Admin + profils de démo.
-- À exécuter APRÈS 0019 (les valeurs d'enum 'ca' / 'admin' doivent exister).
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Après exécution : NOTIFY pgrst, 'reload schema';
-- =============================================================================

-- Journal des modifications (alimenté à chaque édition par un Admin).
create table if not exists historique_modifications (
  id              uuid primary key default gen_random_uuid(),
  table_name      text not null,
  champ           text not null,
  ancienne_valeur text,
  nouvelle_valeur text,
  chantier_id     uuid references chantiers(id) on delete cascade,
  modifie_par     uuid references utilisateurs(id) on delete set null,
  modifie_le      timestamptz not null default now()
);

create index if not exists idx_histo_chantier on historique_modifications(chantier_id);

-- Profils de démo (mode démo : un utilisateur par rôle).
insert into utilisateurs (email, role, prenom, nom)
values ('simon.forestier@mzboisetcompagnie.com', 'ca', 'Simon', 'Forestier')
on conflict (email) do nothing;

insert into utilisateurs (email, role, prenom, nom)
values ('marie.zinopoulos@mzboisetcompagnie.com', 'admin', 'Marie', 'Zinopoulos')
on conflict (email) do nothing;

-- =============================================================================
-- MZ Bois & Compagnie — Schéma de gestion de chantiers de menuiserie
-- Cible : PostgreSQL / Supabase (à exécuter dans SQL Editor)
--
-- Conventions :
--   - Clés primaires : uuid, générées par gen_random_uuid()
--   - Montants        : numeric(12,2)   (€ HT)
--   - Quantités       : numeric(12,2)   (unités, m², ml…)
--   - Pourcentages    : numeric(6,2)
--   - Horodatage      : timestamptz (created_at, messages, feedbacks…)
--   - Dates métier    : date (livraison, pose, échéances…)
--
-- Les abréviations issues du cahier des charges sont documentées via
-- COMMENT ON COLUMN — vérifie ces interprétations et ajuste si besoin.
-- =============================================================================

begin;

-- Extension utilitaire (gen_random_uuid) — déjà présente sur Supabase.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('dir', 'be', 'prog', 'prod', 'ca', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'statut_ouvrage') then
    create type statut_ouvrage as enum (
      'a_faire_be', 'en_attente', 'validation_client', 'prog_a_faire',
      'pret_a_fabriquer', 'fabrication', 'termine', 'facture'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'statut_achat') then
    create type statut_achat as enum (
      'a_traiter', 'en_stock', 'a_commander', 'en_cours_livraison',
      'recu', 'recu_partiellement', 'non_conforme'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'statut_course') then
    create type statut_course as enum (
      'programmee', 'urgente', 'en_cours', 'faite', 'annulee'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'statut_feedback') then
    create type statut_feedback as enum ('remonte', 'en_cours', 'resolu');
  end if;

  if not exists (select 1 from pg_type where typname = 'typ_achat') then
    create type typ_achat as enum (
      'panneau', 'strat', 'chants', 'quincaillerie', 'sous_traitance', 'divers'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'phase_planning') then
    create type phase_planning as enum ('etude', 'fabrication', 'pose');
  end if;

  if not exists (select 1 from pg_type where typname = 'statut_reunion') then
    create type statut_reunion as enum ('on_track', 'attention', 'bloque');
  end if;

  if not exists (select 1 from pg_type where typname = 'type_societe') then
    create type type_societe as enum (
      'fournisseur', 'client', 'sous_traitant', 'transporteur'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'copil_type') then
    create type copil_type as enum ('chantiers', 'hommes_cles', 'strategie');
  end if;
  if not exists (select 1 from pg_type where typname = 'copil_reunion_statut') then
    create type copil_reunion_statut as enum ('planifiee', 'faite');
  end if;
  if not exists (select 1 from pg_type where typname = 'copil_sujet_statut') then
    create type copil_sujet_statut as enum ('boite', 'ordre_du_jour', 'traite');
  end if;
end
$$;

-- =============================================================================
-- 1. Référentiels indépendants
-- =============================================================================

-- Utilisateurs de l'application (direction, bureau d'études, prog., production)
create table if not exists utilisateurs (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  role       user_role not null,
  prenom     text not null,
  nom        text not null,
  created_at timestamptz not null default now()
);

-- Journal des modifications Admin (traçabilité — migration 0020)
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

-- Sociétés (fournisseurs, clients, sous-traitants, transporteurs)
create table if not exists fournisseurs (
  id       uuid primary key default gen_random_uuid(),
  nom      text not null,
  adresse  text, -- adresse du siège social
  adresse_livraison text, -- adresse de livraison (si différente)
  famille  text, -- famille produit (panneaux, quincaillerie…)
  type     type_societe not null default 'fournisseur',
  site_web text
);

-- Employés (main-d'œuvre atelier / pose — distincts des utilisateurs de l'app)
create table if not exists employes (
  id          uuid primary key default gen_random_uuid(),
  prenom      text not null,
  nom         text not null,
  role        text,
  poste       text,
  contrat     text,
  date_entree date,
  date_naissance date, -- anniversaires (alertes dashboard)
  tel         text,
  email       text,
  cout_h      numeric(12, 2),
  couleur     text, -- couleur d'affichage (hex) — avatars + planning
  note        text
);
comment on column employes.cout_h is 'Coût horaire chargé (€/h)';

-- Contacts rattachés à un fournisseur
create table if not exists contacts (
  id             uuid primary key default gen_random_uuid(),
  fournisseur_id uuid not null references fournisseurs (id) on delete cascade,
  nom            text not null,
  role           text,
  tel            text,
  email          text
);

-- =============================================================================
-- 2. Chantiers et ouvrages
-- =============================================================================

-- Chantiers
create table if not exists chantiers (
  id         uuid primary key default gen_random_uuid(),
  num        text unique,
  client     text,
  nom        text not null,
  dep_approx date,
  ca_id      uuid references utilisateurs (id) on delete set null,
  avec_pose  boolean not null default false,
  heures_vendues      numeric(12, 2) not null default 0,
  heures_realisees    numeric(12, 2) not null default 0,
  fournitures_vendues numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);
comment on column chantiers.num is 'Numéro de chantier (identifiant métier)';
comment on column chantiers.dep_approx is 'Date de départ / livraison approximative';
comment on column chantiers.ca_id is 'Chargé d''affaires (référence utilisateurs)';
comment on column chantiers.avec_pose is 'Chantier avec prestation de pose';

-- Ouvrages d'un chantier
create table if not exists ouvrages (
  id         uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers (id) on delete cascade,
  nom        text not null,
  statut     statut_ouvrage,
  notes      text,
  qty        numeric(12, 2),
  dep        date,
  livraison  date,
  camion     text,
  pose       boolean not null default false,
  dp_pose    date,
  poseur_id  uuid references employes (id) on delete set null,
  devis      text, -- N° de devis (référence, ex : DEV-001)
  sit_pct    numeric(6, 2),
  fact_def   boolean not null default false
);
comment on column ouvrages.qty is 'Quantité (unités, m², ml…)';
comment on column ouvrages.dep is 'Date de départ atelier';
comment on column ouvrages.camion is 'Camion / tournée de livraison';
comment on column ouvrages.pose is 'Ouvrage à poser';
comment on column ouvrages.dp_pose is 'Date prévue de pose';
comment on column ouvrages.poseur_id is 'Employé chargé de la pose';
comment on column ouvrages.devis is 'N° de devis (référence, ex : DEV-001)';
comment on column ouvrages.sit_pct is 'Avancement de la situation (%)';
comment on column ouvrages.fact_def is 'Facturé définitivement (oui/non)';

-- =============================================================================
-- 3. Achats
-- =============================================================================

create table if not exists achats (
  id             uuid primary key default gen_random_uuid(),
  chantier_id    uuid references chantiers (id) on delete cascade,
  nom            text not null,
  ref            text,
  typ            typ_achat,
  fournisseur_id uuid references fournisseurs (id) on delete set null,
  dtl            text,
  qty            numeric(12, 2),
  stk            numeric(12, 2),
  acmd           numeric(12, 2),
  st             statut_achat,
  prix_u         numeric(12, 2),
  mht            numeric(12, 2),
  date_reception date
);
comment on column achats.dtl is 'Détail / désignation complémentaire';
comment on column achats.qty is 'Quantité à acheter';
comment on column achats.stk is 'Quantité en stock';
comment on column achats.acmd is 'Quantité à commander';
comment on column achats.prix_u is 'Prix unitaire (€ HT)';
comment on column achats.mht is 'Montant total (€ HT)';

-- Liaison achats <-> ouvrages (un achat peut concerner plusieurs ouvrages)
create table if not exists achats_ouvrages (
  achat_id   uuid not null references achats (id) on delete cascade,
  ouvrage_id uuid not null references ouvrages (id) on delete cascade,
  primary key (achat_id, ouvrage_id)
);

-- =============================================================================
-- 4. Logistique / courses
-- =============================================================================

-- Courses / navettes (transports internes ou vers fournisseurs)
create table if not exists courses (
  id           uuid primary key default gen_random_uuid(),
  date         date,
  heure_depart time,
  statut       statut_course,
  qui_id      uuid,
  qui_type    text,
  de_id       uuid,
  vers_id     uuid,
  chantier_id uuid references chantiers (id) on delete set null,
  ouvrage     text,
  quoi        text,
  commentaire text
);
comment on column courses.qui_id is 'Acteur de la course (référence polymorphe selon qui_type)';
comment on column courses.qui_type is 'Type d''acteur (employe / fournisseur / externe…)';
comment on column courses.de_id is 'Lieu de départ (référence polymorphe — pas de FK)';
comment on column courses.vers_id is 'Lieu d''arrivée (référence polymorphe — pas de FK)';

-- =============================================================================
-- 5. Planning
-- =============================================================================

-- Affectations de planning (salariés sur phases de chantier)
create table if not exists plan_affectations (
  id          uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers (id) on delete cascade,
  phase       phase_planning,
  sal_id      uuid references employes (id) on delete set null,
  date_debut  date,
  date_fin    date,
  heure_debut time, -- null = toute la journée
  heure_fin   time,
  commentaire text
);
comment on column plan_affectations.sal_id is 'Salarié affecté (référence employes)';

-- =============================================================================
-- 6. Qualité / feedbacks
-- =============================================================================

create table if not exists feedbacks (
  id            uuid primary key default gen_random_uuid(),
  chantier_id   uuid references chantiers (id) on delete cascade,
  ouvrage_id    uuid references ouvrages (id) on delete set null,
  description   text not null,
  saisi_par     uuid references utilisateurs (id) on delete set null,
  date          timestamptz not null default now(),
  statut        statut_feedback,
  solution      text,
  date_solution date
);

-- =============================================================================
-- 7. Tâches
-- =============================================================================

create table if not exists taches (
  id          uuid primary key default gen_random_uuid(),
  texte       text not null,
  done        boolean not null default false,
  chantier_id uuid references chantiers (id) on delete cascade,
  assigne_a   uuid references employes (id) on delete set null,
  created_at  timestamptz not null default now(),
  source      text,
  echeance    date
);
comment on column taches.assigne_a is 'Employé assigné (référence employes)';
comment on column taches.source is 'Origine de la tâche (réunion, feedback, manuel…)';
comment on column taches.echeance is 'Date d''échéance';

-- =============================================================================
-- 8. Fil de discussion par chantier
-- =============================================================================

create table if not exists fil_messages (
  id          uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers (id) on delete cascade,
  auteur_id   uuid references utilisateurs (id) on delete set null,
  texte       text not null,
  ouvrage_tag text,
  parent_id   uuid references fil_messages (id) on delete cascade,
  date        timestamptz not null default now()
);
comment on column fil_messages.ouvrage_tag is 'Étiquette d''ouvrage mentionné dans le message';
comment on column fil_messages.parent_id is 'Message parent si réponse en fil (null = message racine)';

-- =============================================================================
-- 9. Réunions et actions
-- =============================================================================

create table if not exists reunions (
  id          uuid primary key default gen_random_uuid(),
  chantier_id uuid references chantiers (id) on delete cascade,
  date        date,
  statut      statut_reunion,
  notes       text
);

create table if not exists reunion_actions (
  id         uuid primary key default gen_random_uuid(),
  reunion_id uuid not null references reunions (id) on delete cascade,
  texte      text not null,
  assigne_a  uuid references employes (id) on delete set null,
  done       boolean not null default false
);
comment on column reunion_actions.assigne_a is 'Employé assigné (référence employes)';

-- =============================================================================
-- 10. Bibliothèques (articles + ouvrages modèles)
-- =============================================================================

create table if not exists articles (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  description text,
  typ         typ_achat,
  prix        numeric(12, 2),
  unite       text
);

create table if not exists article_fournisseurs (
  article_id     uuid not null references articles (id) on delete cascade,
  fournisseur_id uuid not null references fournisseurs (id) on delete cascade,
  primary key (article_id, fournisseur_id)
);

create table if not exists ouvrage_modeles (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  description text,
  typs        typ_achat[] not null default '{}'
);

-- Composition d'un ouvrage modèle en articles de bibliothèque (migration 0018)
create table if not exists modele_articles (
  id            uuid primary key default gen_random_uuid(),
  modele_id     uuid not null references ouvrage_modeles(id) on delete cascade,
  article_id    uuid not null references articles(id) on delete cascade,
  quantite      numeric(12, 2) not null default 1,
  statut_defaut text not null default 'a_commander',
  unique (modele_id, article_id)
);

-- COPIL (comités de pilotage)
create table if not exists copil_reunions (
  id            uuid primary key default gen_random_uuid(),
  type          copil_type not null,
  date          date,
  heure         time,
  ordre_du_jour text,
  notes         text,
  statut        copil_reunion_statut not null default 'planifiee',
  created_at    timestamptz not null default now()
);

create table if not exists copil_sujets (
  id          uuid primary key default gen_random_uuid(),
  type        copil_type not null,
  titre       text not null,
  description text,
  soumis_par  uuid references utilisateurs (id) on delete set null,
  date        date not null default current_date,
  statut      copil_sujet_statut not null default 'boite'
);

create table if not exists copil_actions (
  id         uuid primary key default gen_random_uuid(),
  reunion_id uuid not null references copil_reunions (id) on delete cascade,
  texte      text not null,
  assigne_a  uuid references employes (id) on delete set null,
  done       boolean not null default false
);

-- Configuration globale (ligne unique id = 1)
create table if not exists parametres (
  id            int primary key default 1,
  cout_horaire  numeric(12, 2) not null default 45,
  alerte_orange int not null default 3,
  alerte_rouge  int not null default 7,
  unites        text[] not null default '{panneau,ml,m²,pièce,rouleau}',
  droits        jsonb not null default '{}'::jsonb,
  constraint parametres_singleton check (id = 1)
);

-- =============================================================================
-- Index (clés étrangères + colonnes fréquemment filtrées)
-- =============================================================================

-- utilisateurs
create index if not exists idx_utilisateurs_role on utilisateurs (role);

-- sociétés / contacts
create index if not exists idx_fournisseurs_type on fournisseurs (type);
create index if not exists idx_contacts_fournisseur on contacts (fournisseur_id);

-- chantiers
create index if not exists idx_chantiers_ca on chantiers (ca_id);

-- ouvrages
create index if not exists idx_ouvrages_chantier  on ouvrages (chantier_id);
create index if not exists idx_ouvrages_poseur    on ouvrages (poseur_id);
create index if not exists idx_ouvrages_statut    on ouvrages (statut);
create index if not exists idx_ouvrages_livraison on ouvrages (livraison);

-- achats
create index if not exists idx_achats_chantier   on achats (chantier_id);
create index if not exists idx_achats_fournisseur on achats (fournisseur_id);
create index if not exists idx_achats_st          on achats (st);
create index if not exists idx_achats_typ         on achats (typ);

-- achats_ouvrages (liaison)
create index if not exists idx_achats_ouvrages_ouvrage on achats_ouvrages (ouvrage_id);

-- courses
create index if not exists idx_courses_chantier on courses (chantier_id);
create index if not exists idx_courses_date     on courses (date);
create index if not exists idx_courses_statut   on courses (statut);

-- plan_affectations
create index if not exists idx_plan_chantier on plan_affectations (chantier_id);
create index if not exists idx_plan_sal      on plan_affectations (sal_id);
create index if not exists idx_plan_dates    on plan_affectations (date_debut, date_fin);

-- feedbacks
create index if not exists idx_feedbacks_chantier on feedbacks (chantier_id);
create index if not exists idx_feedbacks_ouvrage  on feedbacks (ouvrage_id);
create index if not exists idx_feedbacks_statut   on feedbacks (statut);

-- taches
create index if not exists idx_taches_chantier on taches (chantier_id);
create index if not exists idx_taches_assigne  on taches (assigne_a);
create index if not exists idx_taches_done     on taches (done);
create index if not exists idx_taches_echeance on taches (echeance);

-- fil_messages
create index if not exists idx_fil_chantier on fil_messages (chantier_id);
create index if not exists idx_fil_auteur   on fil_messages (auteur_id);
create index if not exists idx_fil_parent   on fil_messages (parent_id);
create index if not exists idx_fil_date     on fil_messages (date);

-- reunions / actions
create index if not exists idx_reunions_chantier       on reunions (chantier_id);
create index if not exists idx_reunion_actions_reunion on reunion_actions (reunion_id);
create index if not exists idx_reunion_actions_assigne on reunion_actions (assigne_a);

-- bibliothèques
create index if not exists idx_articles_typ on articles (typ);
create index if not exists idx_article_fournisseurs_fournisseur
  on article_fournisseurs (fournisseur_id);

commit;

-- =============================================================================
-- (Optionnel) Sécurité au niveau ligne — RLS
-- Sur Supabase, sans RLS ni policies, ces tables restent accessibles selon les
-- GRANT par défaut. Décommente et adapte selon ta stratégie d'accès.
-- =============================================================================
-- alter table utilisateurs      enable row level security;
-- alter table fournisseurs      enable row level security;
-- alter table employes          enable row level security;
-- alter table contacts          enable row level security;
-- alter table chantiers         enable row level security;
-- alter table ouvrages          enable row level security;
-- alter table achats            enable row level security;
-- alter table achats_ouvrages   enable row level security;
-- alter table courses           enable row level security;
-- alter table plan_affectations enable row level security;
-- alter table feedbacks         enable row level security;
-- alter table taches            enable row level security;
-- alter table fil_messages      enable row level security;
-- alter table reunions          enable row level security;
-- alter table reunion_actions   enable row level security;

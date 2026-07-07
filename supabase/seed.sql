-- =============================================================================
-- MZ Bois & Compagnie — Données de test (maquette)
-- À exécuter APRÈS schema.sql, dans le SQL Editor de Supabase.
--
-- UUID fixes et lisibles par préfixe pour faciliter les liaisons :
--   utilisateurs 1111…   employés 2222…   fournisseurs 3333…
--   chantiers    4444…   ouvrages 5555…   achats       6666…
-- Rejouable : chaque insert utilise "on conflict do nothing".
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Utilisateurs de l'application
-- -----------------------------------------------------------------------------
insert into utilisateurs (id, email, role, prenom, nom) values
  ('11111111-1111-1111-1111-000000000001', 'laurent@mzboisetcompagnie.com',  'dir',  'Laurent',  'Mercier'),
  ('11111111-1111-1111-1111-000000000002', 'jonathan@mzboisetcompagnie.com', 'be',   'Jonathan', 'Martin'),
  ('11111111-1111-1111-1111-000000000003', 'marc@mzboisetcompagnie.com',     'prog', 'Marc',     'Dupuis'),
  ('11111111-1111-1111-1111-000000000004', 'pierre@mzboisetcompagnie.com',   'prod', 'Pierre',   'Bernard')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Employés (8)
-- -----------------------------------------------------------------------------
insert into employes (id, prenom, nom, role, poste, contrat, date_entree, tel, email, cout_h, note) values
  ('22222222-2222-2222-2222-000000000001', 'Jonathan', 'Martin',   'BE',        'Bureau d''études',     'CDI', '2018-03-01', '0601020301', 'jonathan@mzboisetcompagnie.com', 52.00, 'Responsable bureau d''études'),
  ('22222222-2222-2222-2222-000000000002', 'Marc',     'Dupuis',   'Prog',      'Programmation / débit', 'CDI', '2019-09-15', '0601020302', 'marc@mzboisetcompagnie.com',     48.00, 'Programmation CN'),
  ('22222222-2222-2222-2222-000000000003', 'Pierre',   'Bernard',  'Chef',      'Chef d''atelier',      'CDI', '2015-01-10', '0601020303', 'pierre@mzboisetcompagnie.com',   55.00, 'Chef d''atelier / production'),
  ('22222222-2222-2222-2222-000000000004', 'Thomas',   'Petit',    'Menuisier', 'Atelier',              'CDI', '2020-06-02', '0601020304', null,                             45.00, null),
  ('22222222-2222-2222-2222-000000000005', 'Nicolas',  'Moreau',   'Menuisier', 'Atelier',              'CDI', '2021-02-18', '0601020305', null,                             45.00, null),
  ('22222222-2222-2222-2222-000000000006', 'Julien',   'Girard',   'Menuisier', 'Atelier',              'CDI', '2022-04-11', '0601020306', null,                             43.00, null),
  ('22222222-2222-2222-2222-000000000007', 'Kevin',    'Roux',     'Menuisier', 'Atelier',              'CDD', '2024-01-08', '0601020307', null,                             40.00, 'Contrat en cours'),
  ('22222222-2222-2222-2222-000000000008', 'Antoine',  'Faure',    'Poseur',    'Pose / chantier',      'CDI', '2017-11-20', '0601020308', 'antoine@mzboisetcompagnie.com',  47.00, 'Référent pose')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Fournisseurs (10)
-- -----------------------------------------------------------------------------
insert into fournisseurs (id, nom, adresse, categorie) values
  ('33333333-3333-3333-3333-000000000001', 'ARTICOP',    'Zone Industrielle, Lyon',        'Stratifiés'),
  ('33333333-3333-3333-3333-000000000002', 'DISPANO',    '12 rue des Ébénistes, Villeurbanne', 'Panneaux'),
  ('33333333-3333-3333-3333-000000000003', 'Würth Pro',  'Route de Strasbourg, Erstein',   'Quincaillerie / consommables'),
  ('33333333-3333-3333-3333-000000000004', 'Bois & Co',  '5 avenue du Rhône, Vénissieux',  'Bois massif'),
  ('33333333-3333-3333-3333-000000000005', 'BAIE PLAST', 'Parc Activités, Saint-Priest',   'Menuiseries PVC / alu'),
  ('33333333-3333-3333-3333-000000000006', 'HÄFELE',     'ZA Nord, Chassieu',              'Quincaillerie'),
  ('33333333-3333-3333-3333-000000000007', 'BLUM France','Rue de l''Industrie, Bron',      'Ferrures / charnières'),
  ('33333333-3333-3333-3333-000000000008', 'SALICE',     'Allée des Artisans, Corbas',     'Charnières / coulisses'),
  ('33333333-3333-3333-3333-000000000009', 'PANOFRANCE', 'Boulevard Yves Farge, Lyon',     'Panneaux / dérivés'),
  ('33333333-3333-3333-3333-000000000010', 'EGGER',      'Distribution France',            'Panneaux mélaminés')
on conflict (id) do nothing;

-- Un contact par principal fournisseur
insert into contacts (id, fournisseur_id, nom, role, tel, email) values
  ('33333333-0000-0000-0000-000000000001', '33333333-3333-3333-3333-000000000002', 'Sophie Lambert',  'Commercial',    '0478112233', 'commercial@dispano.fr'),
  ('33333333-0000-0000-0000-000000000002', '33333333-3333-3333-3333-000000000001', 'Karim Benali',    'Commercial',    '0472445566', 'contact@articop.fr'),
  ('33333333-0000-0000-0000-000000000003', '33333333-3333-3333-3333-000000000003', 'Hélène Dubois',   'ADV',           '0388998877', 'adv@wurth.fr')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Chantiers (3)
-- -----------------------------------------------------------------------------
insert into chantiers (id, num, client, nom, dep_approx, ca_id, avec_pose) values
  ('44444444-4444-4444-4444-000000000001', '228-LEFEBVRE', 'Lefebvre',   'Aménagement villa Lefebvre',  '2026-09-15', '11111111-1111-1111-1111-000000000002', true),
  ('44444444-4444-4444-4444-000000000002', '291-TF2026',   'TF Groupe',  'Agencement bureaux TF 2026',  '2026-10-30', '11111111-1111-1111-1111-000000000001', false),
  ('44444444-4444-4444-4444-000000000003', '365-DVN',      'DVN',        'Agencement boutique DVN',     '2026-08-20', '11111111-1111-1111-1111-000000000002', true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Ouvrages (2 par chantier)
-- -----------------------------------------------------------------------------
insert into ouvrages (id, chantier_id, nom, statut, qty, dep, livraison, camion, pose, dp_pose, poseur_id, devis, sit_pct, fact_def) values
  -- 228-LEFEBVRE
  ('55555555-5555-5555-5555-000000000001', '44444444-4444-4444-4444-000000000001', 'Cuisine sur mesure',   'fabrication',       1, '2026-09-10', '2026-09-14', 'Camion 1', true,  '2026-09-15', '22222222-2222-2222-2222-000000000008', 12000.00, 40.00, false),
  ('55555555-5555-5555-5555-000000000002', '44444444-4444-4444-4444-000000000001', 'Dressing chambre',     'pret_a_fabriquer',  1, null,         null,         null,       true,  '2026-09-18', '22222222-2222-2222-2222-000000000008',  4500.00,  0.00, false),
  -- 291-TF2026
  ('55555555-5555-5555-5555-000000000003', '44444444-4444-4444-4444-000000000002', 'Banque d''accueil',    'a_faire_be',        1, null,         null,         null,       false, null,         null,                                   8000.00,  0.00, false),
  ('55555555-5555-5555-5555-000000000004', '44444444-4444-4444-4444-000000000002', 'Habillage mural',      'validation_client', 1, null,         null,         null,       false, null,         null,                                   6000.00,  0.00, false),
  -- 365-DVN
  ('55555555-5555-5555-5555-000000000005', '44444444-4444-4444-4444-000000000003', 'Meubles salle de bain','termine',           3, '2026-08-12', '2026-08-18', 'Camion 2', true,  '2026-08-19', '22222222-2222-2222-2222-000000000008',  9000.00,100.00, true),
  ('55555555-5555-5555-5555-000000000006', '44444444-4444-4444-4444-000000000003', 'Placards entrée',      'prog_a_faire',      2, null,         null,         null,       true,  '2026-08-19', '22222222-2222-2222-2222-000000000008',  3500.00, 20.00, false)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Achats
-- -----------------------------------------------------------------------------
insert into achats (id, chantier_id, nom, ref, typ, fournisseur_id, dtl, qty, stk, acmd, st, prix_u, mht) values
  ('66666666-6666-6666-6666-000000000001', '44444444-4444-4444-4444-000000000001', 'Panneau mélaminé chêne', 'MEL-CHENE-19', 'panneau',       '33333333-3333-3333-3333-000000000002', 'Épaisseur 19mm, 2800x2070', 20, 0,  20, 'a_commander',        45.00,  900.00),
  ('66666666-6666-6666-6666-000000000002', '44444444-4444-4444-4444-000000000001', 'Charnières Blum Clip',   'BLUM-71B3550', 'quincaillerie', '33333333-3333-3333-3333-000000000007', 'Charnières 110°',           40, 40, 0,  'en_stock',            3.50,  140.00),
  ('66666666-6666-6666-6666-000000000003', '44444444-4444-4444-4444-000000000002', 'Stratifié blanc mat',    'STRAT-BLC-M',  'strat',         '33333333-3333-3333-3333-000000000001', 'Format 3050x1300',          15, 0,  0,  'a_traiter',          60.00,  900.00),
  ('66666666-6666-6666-6666-000000000004', '44444444-4444-4444-4444-000000000003', 'Chants ABS chêne',       'ABS-CHENE-23', 'chants',        '33333333-3333-3333-3333-000000000003', 'Rouleau 23mm',             100, 100, 0, 'recu',                1.20,  120.00),
  ('66666666-6666-6666-6666-000000000005', '44444444-4444-4444-4444-000000000003', 'Vérins pneumatiques',    'VERIN-100N',   'quincaillerie', '33333333-3333-3333-3333-000000000006', 'Force 100N',                 6, 0,  6,  'en_cours_livraison', 12.00,   72.00)
on conflict (id) do nothing;

-- Liaisons achats <-> ouvrages
insert into achats_ouvrages (achat_id, ouvrage_id) values
  ('66666666-6666-6666-6666-000000000001', '55555555-5555-5555-5555-000000000001'),
  ('66666666-6666-6666-6666-000000000002', '55555555-5555-5555-5555-000000000001'),
  ('66666666-6666-6666-6666-000000000002', '55555555-5555-5555-5555-000000000002'),
  ('66666666-6666-6666-6666-000000000003', '55555555-5555-5555-5555-000000000003'),
  ('66666666-6666-6666-6666-000000000004', '55555555-5555-5555-5555-000000000005'),
  ('66666666-6666-6666-6666-000000000004', '55555555-5555-5555-5555-000000000006'),
  ('66666666-6666-6666-6666-000000000005', '55555555-5555-5555-5555-000000000005')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Courses / navettes
-- (qui_id -> employé selon qui_type ; de_id/vers_id polymorphes, sans FK)
-- -----------------------------------------------------------------------------
insert into courses (id, date, statut, qui_id, qui_type, de_id, vers_id, chantier_id, ouvrage, quoi, commentaire) values
  ('77777777-7777-7777-7777-000000000001', '2026-09-08', 'programmee', '22222222-2222-2222-2222-000000000004', 'employe', '33333333-3333-3333-3333-000000000002', '44444444-4444-4444-4444-000000000001', '44444444-4444-4444-4444-000000000001', 'Cuisine sur mesure', 'Récupérer panneaux mélaminé chez DISPANO', 'Prévoir remorque'),
  ('77777777-7777-7777-7777-000000000002', '2026-09-09', 'urgente',    '22222222-2222-2222-2222-000000000007', 'employe', '33333333-3333-3333-3333-000000000003', '44444444-4444-4444-4444-000000000001', '44444444-4444-4444-4444-000000000001', null,                 'Chercher quincaillerie manquante chez Würth',   'Bloque le montage'),
  ('77777777-7777-7777-7777-000000000003', '2026-08-14', 'faite',      '22222222-2222-2222-2222-000000000008', 'employe', null,                                   '44444444-4444-4444-4444-000000000003', '44444444-4444-4444-4444-000000000003', 'Meubles salle de bain', 'Livraison meubles SDB sur chantier',        null)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Planning — affectations
-- -----------------------------------------------------------------------------
insert into plan_affectations (id, chantier_id, phase, sal_id, date_debut, date_fin, commentaire) values
  ('88888888-8888-8888-8888-000000000001', '44444444-4444-4444-4444-000000000001', 'fabrication', '22222222-2222-2222-2222-000000000004', '2026-09-08', '2026-09-12', 'Fabrication cuisine'),
  ('88888888-8888-8888-8888-000000000002', '44444444-4444-4444-4444-000000000001', 'pose',        '22222222-2222-2222-2222-000000000008', '2026-09-15', '2026-09-17', 'Pose cuisine + dressing'),
  ('88888888-8888-8888-8888-000000000003', '44444444-4444-4444-4444-000000000002', 'etude',       '22222222-2222-2222-2222-000000000001', '2026-09-01', '2026-09-10', 'Étude banque accueil'),
  ('88888888-8888-8888-8888-000000000004', '44444444-4444-4444-4444-000000000003', 'fabrication', '22222222-2222-2222-2222-000000000005', '2026-08-10', '2026-08-14', 'Fabrication meubles SDB')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Feedbacks
-- -----------------------------------------------------------------------------
insert into feedbacks (id, chantier_id, ouvrage_id, description, saisi_par, date, statut, solution, date_solution) values
  ('99999999-9999-9999-9999-000000000001', '44444444-4444-4444-4444-000000000001', '55555555-5555-5555-5555-000000000001', 'Défaut d''alignement sur façade tiroir', '11111111-1111-1111-1111-000000000004', '2026-09-11 09:30:00+02', 'remonte',  null,                                 null),
  ('99999999-9999-9999-9999-000000000002', '44444444-4444-4444-4444-000000000003', '55555555-5555-5555-5555-000000000005', 'Chant décollé sur meuble bas',           '11111111-1111-1111-1111-000000000004', '2026-08-15 14:00:00+02', 'resolu',   'Rechampi et recollage en atelier',   '2026-08-16'),
  ('99999999-9999-9999-9999-000000000003', '44444444-4444-4444-4444-000000000002', '55555555-5555-5555-5555-000000000003', 'Cote client à confirmer avant lancement','11111111-1111-1111-1111-000000000002', '2026-09-02 11:15:00+02', 'en_cours', null,                                 null)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Tâches
-- -----------------------------------------------------------------------------
insert into taches (id, texte, done, chantier_id, assigne_a, source, echeance) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'Valider plans BE banque accueil',        false, '44444444-4444-4444-4444-000000000002', '22222222-2222-2222-2222-000000000001', 'reunion',  '2026-09-05'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000002', 'Commander panneaux mélaminé chêne',      false, '44444444-4444-4444-4444-000000000001', '22222222-2222-2222-2222-000000000002', 'achat',    '2026-09-06'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000003', 'Préparer la pose du dressing',           false, '44444444-4444-4444-4444-000000000001', '22222222-2222-2222-2222-000000000008', 'manuel',   '2026-09-17'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000004', 'Reprendre chant meuble SDB',             true,  '44444444-4444-4444-4444-000000000003', '22222222-2222-2222-2222-000000000003', 'feedback', '2026-08-16')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Fil de discussion par chantier
-- -----------------------------------------------------------------------------
insert into fil_messages (id, chantier_id, auteur_id, texte, ouvrage_tag, date) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001', '44444444-4444-4444-4444-000000000001', '11111111-1111-1111-1111-000000000002', 'Plans cuisine validés, transmis à la prog.',                  'Cuisine sur mesure', '2026-09-05 08:45:00+02'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000002', '44444444-4444-4444-4444-000000000001', '11111111-1111-1111-1111-000000000003', 'Débit lancé, panneaux à commander en urgence.',               'Cuisine sur mesure', '2026-09-07 16:20:00+02'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000003', '44444444-4444-4444-4444-000000000002', '11111111-1111-1111-1111-000000000001', 'RDV client la semaine prochaine pour valider l''habillage.',   'Habillage mural',    '2026-09-03 10:00:00+02'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000004', '44444444-4444-4444-4444-000000000003', '11111111-1111-1111-1111-000000000004', 'Meubles SDB livrés et posés, chantier clôturé.',              null,                 '2026-08-19 17:30:00+02')
on conflict (id) do nothing;

-- Réponses en fil (parent_id -> message racine)
insert into fil_messages (id, chantier_id, auteur_id, texte, ouvrage_tag, parent_id, date) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000005', '44444444-4444-4444-4444-000000000001', '11111111-1111-1111-1111-000000000003', 'Bien reçu, je lance le débit dès demain matin.', null, 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', '2026-09-05 09:10:00+02'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000006', '44444444-4444-4444-4444-000000000002', '11111111-1111-1111-1111-000000000002', 'Je prépare les plans pour le RDV client.',      null, 'bbbbbbbb-bbbb-bbbb-bbbb-000000000003', '2026-09-03 11:30:00+02')
on conflict (id) do nothing;

commit;

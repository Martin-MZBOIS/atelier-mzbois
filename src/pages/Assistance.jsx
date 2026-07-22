import { createContext, useContext, useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store'
import { formatDate } from '../lib/format'

// Onglets d'aide : Général (tous les onglets) + une section par rôle.
const SECTIONS = [
  { id: 'general', label: 'Général' },
  { id: 'dir', label: 'Dirigeant' },
  { id: 'be', label: 'Bureau d’études' },
  { id: 'prog', label: 'Programmeur' },
  { id: 'prod', label: 'Resp. Prod' },
]

const SearchCtx = createContext('')

// Extrait le texte brut d'un arbre de nœuds React (pour la recherche).
function nodeText(node) {
  if (node == null || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join(' ')
  if (node.props) return nodeText(node.props.children)
  return ''
}

function Bloc({ titre, children }) {
  const q = useContext(SearchCtx)
  if (q) {
    const hay = (titre + ' ' + nodeText(children)).toLowerCase()
    if (!hay.includes(q)) return null
  }
  return (
    <div className="help-bloc">
      <h3 className="help-bloc-title">{titre}</h3>
      <div className="help-bloc-body">{children}</div>
    </div>
  )
}

function General() {
  return (
    <>
      <p className="help-intro">
        L’application couvre tout le suivi d’un chantier de menuiserie, du bureau
        d’études à la pose. Voici chaque onglet et son usage.
      </p>

      <Bloc titre="🏠 Tableau de bord">
        Ta page d’accueil. Tu y trouves&nbsp;: la <strong>météo locale</strong>,
        des <strong>alertes cliquables</strong> (départs atelier &lt; 7 jours,
        achats à commander, tâches en retard) qui t’emmènent directement sur
        l’onglet concerné, le <strong>fil d’actualité</strong> (messages,
        achats reçus, feedbacks) filtrable, <strong>Mes tâches</strong> (avec un
        onglet «&nbsp;Terminées&nbsp;» pour l’historique, clic sur une tâche pour
        la modifier), un <strong>mini-planning</strong> de la semaine et les{' '}
        <strong>ouvrages en cours</strong> filtrables par statut.
      </Bloc>

      <Bloc titre="🏗 Chantiers">
        La liste de tous les chantiers, avec <strong>recherche</strong> (par n°
        ou client) et <strong>filtres rapides</strong> (En cours / Actifs / À
        facturer / Terminés). Le chantier <strong>📦 STOCK</strong> (épinglé en
        tête) sert aux commandes non rattachées à un chantier précis. Un clic
        ouvre la <strong>fiche chantier</strong> ; le bouton{' '}
        <strong>✏ Modifier</strong> édite ses infos (n°, client, chargé
        d’affaires, départ, pose).
      </Bloc>

      <Bloc titre="📋 Fiche chantier — les onglets">
        <ul className="help-list">
          <li>
            <strong>Ouvrages</strong> — la liste des ouvrages avec leur statut
            (workflow «&nbsp;À faire BE → En attente → Validation client → Prog à
            faire → Prêt à fabriquer → Fabrication → Terminé → Facturé&nbsp;»).
            Boutons&nbsp;: <em>+ Ouvrage</em>, <em>✏ Détail</em> (modifier tous
            les champs), <em>Départ → tous</em> et <em>Pose → tous</em> (appliquer
            une date à tous), <em>Modèles</em> (créer depuis la bibliothèque), et
            l’<em>achat rapide par typologie</em> sur chaque ouvrage.
          </li>
          <li>
            <strong>Achats</strong> — groupés par typologie (panneau, strat,
            chants, quincaillerie…), repliables, avec statut, quantités, date de
            réception. Clic sur une ligne pour éditer, <em>+ Ajouter</em> pour
            créer.
          </li>
          <li>
            <strong>🚚 Courses</strong> — les courses (enlèvements / livraisons)
            rattachées à ce chantier uniquement.
          </li>
          <li>
            <strong>💬 Fil</strong> — la discussion du chantier&nbsp;: messages,
            réponses en fil, tag d’un ouvrage.
          </li>
          <li>
            <strong>📋 Réunion de chantiers</strong> — les comptes-rendus du
            lundi (date, notes). Les <em>actions</em> assignées créent
            automatiquement des <strong>tâches</strong>.
          </li>
          <li>
            <strong>🔧 Feedbacks</strong> — les remontées atelier (problème sur un
            ouvrage) avec un bouton <em>Marquer résolu</em> et la solution
            apportée.
          </li>
          <li>
            <strong>📊 Analytique</strong> (Dirigeant) — heures vendues/réalisées,
            fournitures vendues/achetées, résultat estimé, import CSV ProGbat.
          </li>
        </ul>
      </Bloc>

      <Bloc titre="📦 Achats (vue globale)">
        Tous les achats de tous les chantiers dans un seul tableau, avec des{' '}
        <strong>filtres rapides</strong> (Tous / À traiter / En livraison / Reçu)
        et un filtre par typologie. Clic sur une ligne pour l’éditer.
      </Bloc>

      <Bloc titre="🚚 Courses (vue globale)">
        Vue <strong>Liste</strong> (filtrable par statut) ou{' '}
        <strong>Calendrier semaine</strong>. Une course peut être confiée à un{' '}
        <strong>employé interne</strong> ou à un <strong>coursier externe</strong>{' '}
        (transporteur) — dans ce cas un bouton <em>📧 Mail</em> apparaît.
      </Bloc>

      <Bloc titre="📅 Planning">
        Deux vues&nbsp;: <strong>Salariés</strong> (une ligne par salarié) et{' '}
        <strong>Chantiers</strong> (Gantt par phases Étude / Fabrication / Pose),
        en mode <strong>Semaine</strong> ou <strong>Mois</strong>. Clique sur une
        cellule vide (vue salariés) ou <em>+ Affecter</em> (vue chantiers) pour
        créer une affectation. Chaque salarié a sa <strong>couleur</strong>.
      </Bloc>

      <Bloc titre="📚 Bibliothèques">
        Deux bibliothèques réutilisables&nbsp;: les <strong>articles</strong>{' '}
        (matières avec prix, unité, fournisseurs) et les{' '}
        <strong>ouvrages modèles</strong>. Clique pour ouvrir et modifier.
      </Bloc>

      <Bloc titre="👥 Contacts">
        Répertoire par onglets&nbsp;: <strong>Fournisseurs</strong>,{' '}
        <strong>Clients</strong>, <strong>Sous-traitants</strong> et{' '}
        <strong>Salariés</strong> (visible seulement pour Direction et
        Resp. Prod). <em>+ Nouveau</em> crée une fiche société, <em>+ Nouveau
        contact</em> ajoute une personne à une fiche.
      </Bloc>
    </>
  )
}

function Dir() {
  return (
    <>
      <p className="help-intro">
        En tant que <strong>Dirigeant</strong>, tu as la vision d’ensemble et les
        outils de pilotage financier.
      </p>
      <Bloc titre="Ton quotidien">
        <ul className="help-list">
          <li>
            Commence par le <strong>Tableau de bord</strong>&nbsp;: les alertes te
            signalent les départs imminents, les achats à commander et les tâches
            en retard.
          </li>
          <li>
            Onglet <strong>📊 Analytique</strong> d’un chantier&nbsp;: compare
            heures vendues/réalisées et fournitures vendues/achetées pour obtenir
            le <strong>résultat estimé</strong>. Tu peux importer un CSV{' '}
            <strong>ProGbat</strong> pour renseigner les heures.
          </li>
          <li>
            ⚠️ <strong>Avant de lire l’analytique</strong>, complète les{' '}
            <strong>montants (€ HT)</strong> des achats — un achat sans montant
            fausse le calcul (une alerte te le rappelle sur le dashboard).
          </li>
          <li>
            Pilote la charge dans <strong>Planning</strong> et gère l’équipe dans{' '}
            <strong>Contacts → Salariés</strong> (couleur, coût horaire).
          </li>
        </ul>
      </Bloc>
    </>
  )
}

function Be() {
  return (
    <>
      <p className="help-intro">
        En tant que <strong>Responsable Bureau d’études</strong>, tu prépares les
        ouvrages avant fabrication.
      </p>
      <Bloc titre="Ton quotidien">
        <ul className="help-list">
          <li>
            Traite les ouvrages au statut <strong>«&nbsp;À faire BE&nbsp;»</strong>{' '}
            puis <strong>«&nbsp;Validation client&nbsp;»</strong> ; utilise{' '}
            <em>✏ Détail</em> pour renseigner devis, quantités et dates.
          </li>
          <li>
            Gagne du temps avec les <strong>ouvrages modèles</strong> (bibliothèque)
            et note les échanges dans le <strong>Fil</strong> du chantier.
          </li>
          <li>
            Suis les décisions des <strong>Réunions de chantiers</strong> (lundi)
            — tes actions deviennent des tâches assignées.
          </li>
        </ul>
      </Bloc>
    </>
  )
}

function Prog() {
  return (
    <>
      <p className="help-intro">
        En tant que <strong>Programmeur</strong>, tu prépares le débit et la
        fabrication.
      </p>
      <Bloc titre="Ton quotidien">
        <ul className="help-list">
          <li>
            Prends les ouvrages <strong>«&nbsp;Prog à faire&nbsp;»</strong> et
            passe-les à <strong>«&nbsp;Prêt à fabriquer&nbsp;»</strong> une fois le
            programme prêt.
          </li>
          <li>
            Depuis un ouvrage, utilise l’<strong>achat rapide par typologie</strong>{' '}
            (panneau, chants…) pour déclencher les commandes matières nécessaires.
          </li>
          <li>
            Vérifie les <strong>dates de départ atelier</strong> et surveille les
            achats <strong>«&nbsp;À commander&nbsp;»</strong>.
          </li>
        </ul>
      </Bloc>
    </>
  )
}

function Prod() {
  return (
    <>
      <p className="help-intro">
        En tant que <strong>Resp. Prod</strong>, tu fabriques, remontes les
        problèmes et gères la logistique.
      </p>
      <Bloc titre="Ton quotidien">
        <ul className="help-list">
          <li>
            Fais avancer les ouvrages en <strong>«&nbsp;Fabrication&nbsp;»</strong>{' '}
            puis <strong>«&nbsp;Terminé&nbsp;»</strong>.
          </li>
          <li>
            Remonte tout souci qualité dans <strong>🔧 Feedbacks</strong> ; le
            responsable pourra le <em>marquer résolu</em> avec la solution.
          </li>
          <li>
            Consulte ton <strong>Planning</strong> (vue Salariés) et organise les{' '}
            <strong>Courses</strong> (enlèvements, livraisons, pose).
          </li>
          <li>
            Accès au répertoire <strong>Contacts → Salariés</strong>.
          </li>
        </ul>
      </Bloc>
    </>
  )
}

// --- 1) Aide contextuelle : rubriques filtrées par rôle -----------------------
function AideSection({ role }) {
  const [section, setSection] = useState('general')
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()

  // Chaque utilisateur ne voit que l'aide qui le concerne ; le Dirigeant voit tout.
  const visible =
    role === 'dir' ? SECTIONS : SECTIONS.filter((s) => s.id === 'general' || s.id === role)

  useEffect(() => {
    if (!visible.some((s) => s.id === section)) setSection('general')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  return (
    <>
      <input
        className="plan-search"
        style={{ width: 320 }}
        placeholder="🔍 Rechercher dans l’aide…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {visible.length > 1 && (
        <nav className="subtabs">
          {visible.map((s) => (
            <button
              key={s.id}
              className={'subtab' + (section === s.id ? ' subtab--active' : '')}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
      )}

      <div className="help-content">
        <SearchCtx.Provider value={q}>
          {section === 'general' && <General />}
          {section === 'dir' && <Dir />}
          {section === 'be' && <Be />}
          {section === 'prog' && <Prog />}
          {section === 'prod' && <Prod />}
        </SearchCtx.Provider>
      </div>
    </>
  )
}

// --- 2) Signaler : problème / idée d'amélioration -----------------------------
const SIGNAL_TYPES = [
  { id: 'probleme', label: '🐞 Problème' },
  { id: 'idee', label: '💡 Idée d’amélioration' },
]
const SIGNAL_STATUT = {
  en_attente: { label: 'En attente', color: '#8a7040' },
  traite: { label: 'Traité', color: '#5a7a5a' },
}

function SignalerSection({ user }) {
  const isDir = user?.role === 'dir'
  const [type, setType] = useState('probleme')
  const [description, setDescription] = useState('')
  const [captureUrl, setCaptureUrl] = useState('')
  const [items, setItems] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [reponses, setReponses] = useState({})

  async function load() {
    let query = supabase
      .from('signalements')
      .select('id, type, description, capture_url, date, statut, reponse, soumis_par')
      .order('date', { ascending: false })
    // Chaque utilisateur voit uniquement ses propres signalements. En mode démo
    // sans ligne `utilisateurs`, l'id est null : on filtre alors sur null plutôt
    // que de ne pas filtrer du tout, ce qui exposerait tous les signalements.
    if (!isDir) {
      query = user?.id ? query.eq('soumis_par', user.id) : query.is('soumis_par', null)
    }
    const { data, error: dbError } = await query
    if (dbError) {
      setError(
        /signalements/.test(dbError.message)
          ? 'Exécute la migration 0025_signalements_nouveautes.sql.'
          : dbError.message
      )
      return
    }
    setError('')
    setItems(data ?? [])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isDir])

  async function send() {
    if (!description.trim()) return
    setSending(true)
    const { error: dbError } = await supabase.from('signalements').insert({
      type,
      description: description.trim(),
      capture_url: captureUrl.trim() || null,
      soumis_par: user?.id ?? null,
    })
    setSending(false)
    if (dbError) {
      setError(
        /signalements/.test(dbError.message)
          ? 'Exécute la migration 0025_signalements_nouveautes.sql.'
          : dbError.message
      )
      return
    }
    setDescription('')
    setCaptureUrl('')
    setDone(true)
    setTimeout(() => setDone(false), 4000)
    await load()
  }

  async function repondre(id) {
    const reponse = (reponses[id] ?? '').trim()
    if (!reponse) return
    await supabase.from('signalements').update({ reponse, statut: 'traite' }).eq('id', id)
    setReponses((r) => ({ ...r, [id]: '' }))
    await load()
  }

  return (
    <div className="help-content">
      <div className="help-bloc">
        <h3 className="help-bloc-title">Signaler</h3>
        <div className="help-bloc-body">
          <div className="fl">
            <label>Type</label>
            <div className="type-toggle">
              {SIGNAL_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={'type-btn' + (type === t.id ? ' type-btn--on' : '')}
                  onClick={() => setType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            className="ni"
            rows="3"
            placeholder="Décrivez le problème ou votre idée…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="fl" style={{ marginTop: 8 }}>
            <label>Lien capture d’écran (optionnel)</label>
            <input
              value={captureUrl}
              onChange={(e) => setCaptureUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          {error && <div className="alert" style={{ marginTop: 8 }}>{error}</div>}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn bp bsm" disabled={sending || !description.trim()} onClick={send}>
              {sending ? 'Envoi…' : 'Envoyer'}
            </button>
            {done && <span className="param-msg">✓ Envoyé au Dirigeant</span>}
          </div>
        </div>
      </div>

      <div className="help-bloc">
        <h3 className="help-bloc-title">
          {isDir ? 'Tous les signalements' : 'Mes signalements'}
        </h3>
        <div className="help-bloc-body">
          {items.length === 0 ? (
            <EmptyState ico="🐛" titre="Aucun signalement" aide="Signalez un dysfonctionnement pour qu’il soit traité." />
          ) : (
            items.map((s) => {
              const st = SIGNAL_STATUT[s.statut] ?? SIGNAL_STATUT.en_attente
              return (
                <div key={s.id} className="signalement">
                  <div className="signalement-head">
                    <span>{s.type === 'idee' ? '💡' : '🐞'}</span>
                    <span className="signalement-date">{formatDate(s.date)}</span>
                    <span
                      className="aspill"
                      style={{ color: st.color, backgroundColor: st.color + '22' }}
                    >
                      {st.label}
                    </span>
                  </div>
                  <div className="signalement-desc">{s.description}</div>
                  {s.capture_url && (
                    <a
                      className="address-link"
                      href={s.capture_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Voir la capture ↗
                    </a>
                  )}
                  {s.reponse && (
                    <div className="signalement-reponse">
                      <strong>Réponse :</strong> {s.reponse}
                    </div>
                  )}
                  {isDir && s.statut !== 'traite' && (
                    <div className="param-add" style={{ marginTop: 6 }}>
                      <input
                        placeholder="Répondre…"
                        value={reponses[s.id] ?? ''}
                        onChange={(e) => setReponses((r) => ({ ...r, [s.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && repondre(s.id)}
                      />
                      <button className="btn bp bsm" onClick={() => repondre(s.id)}>
                        Répondre
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// --- 3) Nouveautés : journal des modifications de l'app -----------------------
function isRecent(dateStr) {
  if (!dateStr) return false
  return (new Date() - new Date(dateStr)) / 86400000 <= 7
}

function NouveautesSection({ user }) {
  const isDir = user?.role === 'dir'
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')

  async function load() {
    const { data, error: dbError } = await supabase
      .from('app_nouveautes')
      .select('id, date, titre, description, visible_roles')
      .order('date', { ascending: false })
    if (dbError) {
      setError(
        /app_nouveautes/.test(dbError.message)
          ? 'Exécute la migration 0025_signalements_nouveautes.sql.'
          : dbError.message
      )
      return
    }
    setError('')
    setItems(data ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function add() {
    if (!titre.trim()) return
    await supabase
      .from('app_nouveautes')
      .insert({ titre: titre.trim(), description: description.trim() || null })
    setTitre('')
    setDescription('')
    await load()
  }

  // visible_roles null = visible par tous.
  const visibles = items.filter(
    (n) => !n.visible_roles?.length || n.visible_roles.includes(user?.role)
  )

  return (
    <div className="help-content">
      {isDir && (
        <div className="help-bloc">
          <h3 className="help-bloc-title">Ajouter une nouveauté</h3>
          <div className="help-bloc-body">
            <div className="fl">
              <label>Titre</label>
              <input value={titre} onChange={(e) => setTitre(e.target.value)} />
            </div>
            <div className="fl">
              <label>Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <button className="btn bp bsm" style={{ marginTop: 8 }} onClick={add}>
              Publier
            </button>
          </div>
        </div>
      )}

      <div className="help-bloc">
        <h3 className="help-bloc-title">Nouveautés</h3>
        <div className="help-bloc-body">
          {error && <div className="alert">{error}</div>}
          {!error && visibles.length === 0 && <EmptyState ico="✨" titre="Aucune nouveauté" aide="Les évolutions de l’application seront annoncées ici." />}
          {visibles.map((n) => (
            <div key={n.id} className="nouveaute">
              <div className="nouveaute-head">
                <span className="nouveaute-date mono">{formatDate(n.date)}</span>
                <span className="nouveaute-titre">{n.titre}</span>
                {isRecent(n.date) && <span className="nouveaute-badge">Nouveau</span>}
              </div>
              {n.description && <div className="nouveaute-desc">{n.description}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'aide', label: 'Aide' },
  { id: 'signaler', label: 'Signaler' },
  { id: 'nouveautes', label: 'Nouveautés' },
]

export default function Assistance() {
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState('aide')

  return (
    <section className="page">
      <div className="page-head">
        <h2>Assistance</h2>
      </div>

      <nav className="subtabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={'subtab' + (tab === t.id ? ' subtab--active' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'aide' && <AideSection role={user?.role} />}
      {tab === 'signaler' && <SignalerSection user={user} />}
      {tab === 'nouveautes' && <NouveautesSection user={user} />}
    </section>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store'
import { useMonEmploye } from '../lib/useMonEmploye'
import { formatDate } from '../lib/format'
import EmptyState from '../components/EmptyState'
import { SkelList } from '../components/Skeleton'

// Provenance d'une tâche (colonne `source`), en clair.
const SOURCES = {
  perso: { label: 'Créée à la main', ico: '✏️' },
  manuel: { label: 'Créée à la main', ico: '✏️' },
  reunion: { label: 'Réunion de chantiers', ico: '📋' },
  copil_hommes_cles: { label: 'COPIL — Hommes clés', ico: '👥' },
  copil_strategie: { label: 'COPIL — Stratégie', ico: '📊' },
  achat: { label: 'Achat', ico: '📦' },
  feedback: { label: 'Feedback atelier', ico: '🔧' },
}
function source(slug) {
  return SOURCES[slug] ?? { label: slug ? 'Origine : ' + slug : 'Origine inconnue', ico: '•' }
}

const PERIODES = [
  { id: 'tout', label: 'Tout' },
  { id: '30', label: '30 jours' },
  { id: '90', label: '3 mois' },
  { id: '365', label: '12 mois' },
]

export default function TachesHistorique() {
  const user = useAuthStore((s) => s.user)
  const { employeId, loading: chargeEmploye } = useMonEmploye()
  // Le Dirigeant voit l'ensemble de l'équipe ; chacun ne voit que ses tâches.
  const voitTout = user?.role === 'dir'

  const [taches, setTaches] = useState(null)
  const [employes, setEmployes] = useState([])
  const [chantiers, setChantiers] = useState([])
  const [erreur, setErreur] = useState('')

  const [statut, setStatut] = useState('terminees')
  const [qui, setQui] = useState('tous')
  const [chantier, setChantier] = useState('tous')
  const [periode, setPeriode] = useState('tout')
  const [recherche, setRecherche] = useState('')

  const charger = useCallback(async () => {
    const jointures =
      'chantier:chantiers!chantier_id(id, num), employe:employes!assigne_a(id, prenom, nom)'
    const avecDate = `id, texte, done, created_at, termine_le, source, echeance, assigne_a, chantier_id, ${jointures}`
    const sansDate = `id, texte, done, created_at, source, echeance, assigne_a, chantier_id, ${jointures}`

    const requete = (champs) => {
      let q = supabase.from('taches').select(champs).order('created_at', { ascending: false })
      if (!voitTout && employeId) q = q.eq('assigne_a', employeId)
      return q
    }
    let { data, error } = await requete(avecDate)
    if (error && /termine_le/.test(error.message)) {
      ;({ data, error } = await requete(sansDate))
    }
    if (error) {
      setErreur(error.message)
      setTaches([])
      return
    }
    setTaches(data ?? [])
  }, [voitTout, employeId])

  useEffect(() => {
    // On attend de savoir qui est l'utilisateur avant de filtrer sur lui,
    // sinon on afficherait brièvement les tâches de tout le monde.
    if (!voitTout && chargeEmploye) return
    charger()
  }, [charger, voitTout, chargeEmploye])

  useEffect(() => {
    let actif = true
    Promise.all([
      supabase.from('employes').select('id, prenom, nom').order('nom'),
      supabase.from('chantiers').select('id, num').order('num'),
    ]).then(([em, ch]) => {
      if (!actif) return
      setEmployes(em.data ?? [])
      setChantiers(ch.data ?? [])
    })
    return () => {
      actif = false
    }
  }, [])

  const filtrees = useMemo(() => {
    if (!taches) return []
    const q = recherche.trim().toLowerCase()
    const limite =
      periode === 'tout' ? null : Date.now() - Number(periode) * 86400000
    return taches.filter((t) => {
      if (statut === 'terminees' && !t.done) return false
      if (statut === 'encours' && t.done) return false
      if (qui !== 'tous' && t.assigne_a !== qui) return false
      if (chantier !== 'tous' && t.chantier_id !== chantier) return false
      if (limite) {
        // On date sur la réalisation quand elle est connue, sinon la création.
        const ref = new Date(t.termine_le ?? t.created_at).getTime()
        if (Number.isNaN(ref) || ref < limite) return false
      }
      if (q && !(t.texte ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [taches, statut, qui, chantier, periode, recherche])

  return (
    <section className="page">
      <div className="page-head">
        <h2>Historique des tâches</h2>
        <span className="page-count">
          {taches ? `${filtrees.length} / ${taches.length}` : ''}
        </span>
      </div>

      {!voitTout && (
        <div className="param-hint" style={{ marginBottom: 10 }}>
          Vous consultez vos propres tâches. Le Dirigeant a la vue de toute
          l’équipe.
        </div>
      )}

      {erreur && (
        <div className="alert">
          <strong>Erreur :</strong> {erreur}
        </div>
      )}

      <div className="hist-filtres">
        <input
          className="plan-search"
          style={{ width: 240, marginBottom: 0 }}
          placeholder="🔍 Rechercher une tâche…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />

        <div className="view-toggle">
          {[
            { id: 'terminees', label: 'Terminées' },
            { id: 'encours', label: 'En cours' },
            { id: 'toutes', label: 'Toutes' },
          ].map((s) => (
            <button
              key={s.id}
              className={'vt' + (statut === s.id ? ' vt--on' : '')}
              onClick={() => setStatut(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {voitTout && (
          <select className="ss" value={qui} onChange={(e) => setQui(e.target.value)}>
            <option value="tous">Toute l’équipe</option>
            {employes.map((e) => (
              <option key={e.id} value={e.id}>
                {e.prenom} {e.nom}
              </option>
            ))}
          </select>
        )}

        <select className="ss" value={chantier} onChange={(e) => setChantier(e.target.value)}>
          <option value="tous">Tous les chantiers</option>
          {chantiers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.num}
            </option>
          ))}
        </select>

        <select className="ss" value={periode} onChange={(e) => setPeriode(e.target.value)}>
          {PERIODES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        {!taches ? (
          <SkelList rows={6} />
        ) : filtrees.length === 0 ? (
          <EmptyState
            ico="🗂"
            titre="Aucune tâche pour ces critères"
            aide="Élargissez la période ou changez de filtre."
          />
        ) : (
          filtrees.map((t) => {
            const src = source(t.source)
            return (
              <div key={t.id} className="hist-item">
                <span className={'hist-etat' + (t.done ? ' hist-etat--ok' : '')}>
                  {t.done ? '✓' : '○'}
                </span>
                <div className="hist-body">
                  <div className={'hist-texte' + (t.done ? ' hist-texte--done' : '')}>
                    {t.texte}
                  </div>
                  <div className="hist-meta">
                    <span title="Origine de la tâche">
                      {src.ico} {src.label}
                    </span>
                    {t.chantier && <span className="mono">{t.chantier.num}</span>}
                    {t.employe && <span>👤 {t.employe.prenom}</span>}
                    <span>Créée le {formatDate(t.created_at)}</span>
                    {t.done && (
                      <span className="hist-fait">
                        {t.termine_le
                          ? 'Terminée le ' + formatDate(t.termine_le)
                          : 'Terminée — date inconnue'}
                      </span>
                    )}
                    {!t.done && t.echeance && (
                      <span>Échéance {formatDate(t.echeance)}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

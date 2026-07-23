import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/format'
import EmptyState from '../../components/EmptyState'

// Le fil d'actualité est une vision périphérique, pas une source de données :
// il montre ce qu'on n'apprendrait pas autrement, pour que celui qui n'était
// pas dans la boucle voie quand même ce qui bouge sur les chantiers.
//
// D'où trois règles tenues ici :
//   - fenêtre courte (7 jours) : au-delà, ce n'est plus de l'actualité, et on
//     retrouve tout dans la fiche chantier ;
//   - seulement du signal : changements d'état, messages, feedbacks nouveaux.
//     Les achats reçus en sont volontairement absents (de la plomberie qu'on
//     va consulter quand on en a besoin) ;
//   - volume borné : on n'affiche pas des centaines de lignes.
const JOURS = 7
const APERCU = 8

const FIL_TYPES = [
  { id: 'tous', label: 'Tous' },
  { id: 'etat', label: '🔄 États' },
  { id: 'msg', label: '💬 Messages' },
  { id: 'fb', label: '🔧 Feedbacks' },
]

function depuis(jours) {
  const d = new Date()
  d.setDate(d.getDate() - jours)
  return d.toISOString()
}

// Fil d'actualité. `chantierIds` restreint le fil à ces chantiers (Chargé
// d'affaire) ; les autres rôles voient tout.
export default function FilActualite({ chantierIds = null }) {
  const navigate = useNavigate()
  const [actus, setActus] = useState([])
  const [filt, setFilt] = useState('tous')
  const [showAll, setShowAll] = useState(false)

  // `null` = tous les chantiers ; un tableau vide = aucun (rien à charger).
  const scoped = Array.isArray(chantierIds)
  const key = scoped ? chantierIds.join(',') : 'all'

  useEffect(() => {
    let active = true
    if (scoped && chantierIds.length === 0) {
      setActus([])
      return
    }
    async function load() {
      const seuil = depuis(JOURS)
      const apply = (q) => (scoped ? q.in('chantier_id', chantierIds) : q)

      const [fil, fb, etats] = await Promise.all([
        apply(
          supabase
            .from('fil_messages')
            .select(
              'id, texte, date, chantier:chantiers!chantier_id(id, num), auteur:utilisateurs!auteur_id(prenom, nom)'
            )
            .gte('date', seuil)
        ),
        apply(
          supabase
            .from('feedbacks')
            .select('id, description, statut, date, chantier:chantiers!chantier_id(id, num)')
            .gte('date', seuil)
        ),
        apply(
          supabase
            .from('historique_modifications')
            .select('id, champ, nouvelle_valeur, modifie_le, chantier:chantiers!chantier_id(id, num)')
            .like('champ', 'statut%')
            .gte('modifie_le', seuil)
        ),
      ])
      if (!active) return

      const acts = []
      for (const m of fil.data ?? [])
        acts.push({
          type: 'msg',
          icon: '💬',
          lbl: `${m.auteur ? m.auteur.prenom + ' ' + m.auteur.nom : '?'} sur ${m.chantier?.num ?? ''}`,
          det: (m.texte ?? '').slice(0, 70),
          cid: m.chantier?.id,
          date: m.date,
        })
      for (const f of fb.data ?? [])
        acts.push({
          type: 'fb',
          icon: '🔧',
          lbl: `Nouveau feedback — ${f.chantier?.num ?? ''}`,
          det: (f.description ?? '').slice(0, 70),
          cid: f.chantier?.id,
          date: f.date,
        })
      // `champ` vaut « statut · <nom de l'ouvrage> » : on en extrait l'ouvrage.
      for (const h of etats.data ?? []) {
        const ouvrage = (h.champ ?? '').split(' · ')[1] ?? ''
        acts.push({
          type: 'etat',
          icon: '🔄',
          lbl: `${h.chantier?.num ?? ''}${ouvrage ? ' · ' + ouvrage : ''}`,
          det: `→ ${h.nouvelle_valeur ?? ''}`,
          cid: h.chantier?.id,
          date: h.modifie_le,
        })
      }

      acts.sort((a, b) => ((b.date ?? '') > (a.date ?? '') ? 1 : -1))
      setActus(acts)
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const filtered = actus.filter((a) => filt === 'tous' || a.type === filt)
  const visible = showAll ? filtered : filtered.slice(0, APERCU)

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Fil d'actualité</span>
        <span className="fil-window">7 derniers jours</span>
      </div>
      <div className="fil-type-row">
        {FIL_TYPES.map((ft) => (
          <button
            key={ft.id}
            className={'qf' + (filt === ft.id ? ' qf--on' : '')}
            onClick={() => {
              setFilt(ft.id)
              setShowAll(false)
            }}
          >
            {ft.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState
          ico="🌤"
          titre="Rien de neuf cette semaine"
          aide="Les changements d’état, messages et feedbacks des 7 derniers jours s’afficheront ici."
        />
      ) : (
        visible.map((a) => (
          <div
            key={a.type + a.date + a.lbl}
            className="fil-item"
            onClick={() => a.cid && navigate(`/chantiers/${a.cid}/ouvrages`)}
          >
            <div className="fil-item-ico">{a.icon}</div>
            <div className="fil-item-body">
              <div className="fil-item-lbl">{a.lbl}</div>
              <div className="fil-item-det">{a.det}</div>
            </div>
            {a.date && <div className="fil-item-date">{formatDateTime(a.date)}</div>}
          </div>
        ))
      )}
      {filtered.length > APERCU && (
        <button className="btn bg bsm dash-more" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Voir moins ▲' : `Voir les ${filtered.length} de la semaine ▼`}
        </button>
      )}
    </div>
  )
}

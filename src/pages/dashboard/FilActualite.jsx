import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/format'

const FIL_TYPES = [
  { id: 'tous', label: 'Tous' },
  { id: 'msg', label: '💬 Messages' },
  { id: 'ach', label: '📦 Achats' },
  { id: 'fb', label: '⚠️ Feedbacks' },
]

// Fil d'actualité : messages, achats reçus et feedbacks non résolus.
// chantierIds : si fourni, restreint le fil à ces chantiers (BE / CA).
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
      const apply = (q) => (scoped ? q.in('chantier_id', chantierIds) : q)
      const [fil, fb, ach] = await Promise.all([
        apply(
          supabase
            .from('fil_messages')
            .select('id, texte, date, chantier:chantiers!chantier_id(id, num), auteur:utilisateurs!auteur_id(prenom, nom)')
        ),
        apply(
          supabase
            .from('feedbacks')
            .select('id, description, statut, date, chantier:chantiers!chantier_id(id, num)')
            .neq('statut', 'resolu')
        ),
        apply(
          supabase
            .from('achats')
            .select('id, nom, st, chantier:chantiers!chantier_id(id, num)')
            .eq('st', 'recu')
        ),
      ])
      if (!active) return
      const acts = []
      for (const m of fil.data ?? [])
        acts.push({
          type: 'msg', icon: '💬',
          lbl: `${m.auteur ? m.auteur.prenom + ' ' + m.auteur.nom : '?'} sur ${m.chantier?.num ?? ''}`,
          det: (m.texte ?? '').slice(0, 60), cid: m.chantier?.id, date: m.date,
        })
      for (const f of fb.data ?? [])
        acts.push({
          type: 'fb', icon: '⚠️',
          lbl: `Feedback — ${f.chantier?.num ?? ''}`,
          det: (f.description ?? '').slice(0, 60), cid: f.chantier?.id, date: f.date,
        })
      for (const a of ach.data ?? [])
        acts.push({
          type: 'ach', icon: '📦',
          lbl: `Reçu — ${a.chantier?.num ?? ''}`,
          det: a.nom, cid: a.chantier?.id, date: null,
        })
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
  const visible = showAll ? filtered : filtered.slice(0, 5)

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Fil d'actualité</span>
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
        <div className="empty">Aucune activité</div>
      ) : (
        visible.map((a, i) => (
          <div
            key={i}
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
      {filtered.length > 5 && (
        <button className="btn bg bsm dash-more" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Voir moins ▲' : `Voir tout (${filtered.length}) ▼`}
        </button>
      )}
    </div>
  )
}

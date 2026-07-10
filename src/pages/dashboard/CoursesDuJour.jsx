import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { isoDay } from '../../lib/dashboard'
import { STATUT_COURSE, resolve } from '../../lib/statuts'

function typeIcon(t) {
  if (t === 'ramasse') return '📥'
  if (t === 'tournee') return '🔄'
  return '🚚'
}
function typeLabel(t) {
  if (t === 'ramasse') return 'Ramasse'
  if (t === 'tournee') return 'Tournée'
  return 'Livraison'
}

// Courses prévues aujourd'hui (hors annulées).
export default function CoursesDuJour() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [noms, setNoms] = useState({})

  useEffect(() => {
    let active = true
    const today = isoDay()
    async function load() {
      const [co, em, fo] = await Promise.all([
        supabase
          .from('courses')
          .select(
            'id, date, heure_depart, type_course, etapes, statut, qui_id, ' +
              'de_libelle, vers_libelle, chantier:chantiers!chantier_id(id, num)'
          )
          .eq('date', today),
        supabase.from('employes').select('id, prenom, nom'),
        supabase.from('fournisseurs').select('id, nom'),
      ])
      if (!active) return
      const m = {}
      for (const e of em.data ?? []) m[e.id] = `${e.prenom} ${e.nom}`
      for (const f of fo.data ?? []) m[f.id] = f.nom
      setNoms(m)
      setCourses((co.data ?? []).filter((c) => c.statut !== 'annulee'))
    }
    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">
          🚚 Courses du jour <span className="card-count">{courses.length}</span>
        </span>
        <button className="btn bg bsm" onClick={() => navigate('/courses')}>
          Voir tout →
        </button>
      </div>
      {courses.length === 0 ? (
        <div className="empty">Aucune course aujourd'hui</div>
      ) : (
        courses.map((c) => {
          const st = resolve(STATUT_COURSE, c.statut)
          return (
            <div key={c.id} className="dash-line" onClick={() => navigate('/courses')}>
              <div className="dash-line-body">
                <div className="dash-line-lbl">
                  {typeIcon(c.type_course)} {typeLabel(c.type_course)}
                  {c.type_course === 'tournee'
                    ? ` — ${(c.etapes ?? []).length} étapes`
                    : ` — ${c.de_libelle ?? '?'} → ${c.vers_libelle ?? '?'}`}
                </div>
                <div className="dash-line-sub">
                  {noms[c.qui_id] ?? '—'}
                  {c.heure_depart ? ' · 🕘 ' + c.heure_depart.slice(0, 5) : ''}
                  {c.chantier?.num ? ' · ' : ''}
                  {c.chantier?.num && <span className="mono">{c.chantier.num}</span>}
                </div>
              </div>
              <span
                className="aspill"
                style={{ color: st.color, backgroundColor: st.color + '22' }}
              >
                {st.label}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}

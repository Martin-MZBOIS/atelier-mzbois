import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'
import { STATUT_COURSE, STATUT_COURSE_ORDER, resolve } from '../lib/statuts'
import CourseModal from './CourseModal'

export default function ChantierCoursesTab() {
  const { chantier } = useOutletContext()
  const [courses, setCourses] = useState([])
  const [employes, setEmployes] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [chantiers, setChantiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)

  async function loadCourses() {
    const { data, error: dbError } = await supabase
      .from('courses')
      .select('id, date, statut, qui_id, qui_type, de_id, vers_id, quoi, commentaire')
      .eq('chantier_id', chantier.id)
      .order('date', { ascending: true })
    if (dbError) {
      setError(dbError.message)
      setCourses([])
    } else {
      setCourses(data ?? [])
    }
  }

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const [, em, fo, ch] = await Promise.all([
        loadCourses(),
        supabase.from('employes').select('id, prenom, nom').order('nom'),
        supabase
          .from('fournisseurs')
          .select('id, nom, type, contacts:contacts!fournisseur_id(email)')
          .order('nom'),
        supabase.from('chantiers').select('id, num, nom').order('num'),
      ])
      if (!active) return
      setEmployes(em.data ?? [])
      setFournisseurs(fo.data ?? [])
      setChantiers(ch.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantier.id])

  const empMap = useMemo(() => {
    const m = {}
    for (const e of employes) m[e.id] = `${e.prenom} ${e.nom}`
    return m
  }, [employes])
  const fourMap = useMemo(() => {
    const m = {}
    for (const f of fournisseurs) m[f.id] = f.nom
    return m
  }, [fournisseurs])
  const transporteurs = useMemo(
    () => fournisseurs.filter((f) => f.type === 'transporteur'),
    [fournisseurs]
  )
  const transporteurEmail = useMemo(() => {
    const m = {}
    for (const f of transporteurs) m[f.id] = f.contacts?.[0]?.email ?? null
    return m
  }, [transporteurs])

  function quiName(c) {
    if (c.qui_type === 'employe') return empMap[c.qui_id] ?? '—'
    if (c.qui_type === 'transporteur' || c.qui_type === 'fournisseur')
      return fourMap[c.qui_id] ?? '—'
    return empMap[c.qui_id] ?? fourMap[c.qui_id] ?? '—'
  }
  function lieuName(id) {
    if (!id) return '—'
    return fourMap[id] ?? empMap[id] ?? '—'
  }

  async function changeStatut(id, newStatut) {
    const previous = courses
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, statut: newStatut } : c)))
    const { error: dbError } = await supabase.from('courses').update({ statut: newStatut }).eq('id', id)
    if (dbError) {
      setCourses(previous)
      setError('Échec de la mise à jour : ' + dbError.message)
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <span className="card-title">Courses</span>
          <span className="card-count">{loading ? '' : courses.length}</span>
        </div>
        <button className="btn bp bsm" onClick={() => setShowModal(true)}>
          + Nouvelle course
        </button>
      </div>

      {loading && <p className="muted">Chargement…</p>}
      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}
      {!loading && !error && courses.length === 0 && (
        <div className="empty">Aucune course pour ce chantier</div>
      )}

      <div className="course-list">
        {courses.map((c) => {
          const st = resolve(STATUT_COURSE, c.statut)
          return (
            <div key={c.id} className="course-card" style={{ borderLeftColor: st.color }}>
              <div className="course-top">
                <div className="course-top-left">
                  <span className="course-date mono">{formatDate(c.date)}</span>
                  <span className="aspill" style={{ color: st.color, backgroundColor: st.color + '22' }}>
                    {st.label}
                  </span>
                </div>
                <div className="course-top-right">
                  {c.qui_type === 'transporteur' && (
                    <a
                      className="btn bg bsm"
                      href={
                        'mailto:' + (transporteurEmail[c.qui_id] ?? '') +
                        '?subject=' + encodeURIComponent('Course ' + chantier.num + ' — ' + (c.quoi ?? ''))
                      }
                    >
                      📧 Mail
                    </a>
                  )}
                  <select className="ss" value={c.statut ?? ''} onChange={(e) => changeStatut(c.id, e.target.value)}>
                    {c.statut == null && <option value="">—</option>}
                    {STATUT_COURSE_ORDER.map((slug) => (
                      <option key={slug} value={slug}>
                        {STATUT_COURSE[slug].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="course-grid">
                <div>
                  <div className="course-lbl">QUI</div>
                  <div className="course-val">{quiName(c)}</div>
                </div>
                <div>
                  <div className="course-lbl">DE</div>
                  <div className="course-val">{lieuName(c.de_id)}</div>
                </div>
                <div>
                  <div className="course-lbl">VERS</div>
                  <div className="course-val">{lieuName(c.vers_id)}</div>
                </div>
              </div>

              <div className="course-foot">
                {c.quoi && <span>📦 {c.quoi}</span>}
                {c.commentaire && <span className="course-com">💬 {c.commentaire}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <CourseModal
          chantiers={chantiers}
          employes={employes}
          transporteurs={transporteurs}
          defaultChantierId={chantier.id}
          onClose={() => setShowModal(false)}
          onSaved={async () => {
            setShowModal(false)
            await loadCourses()
          }}
        />
      )}
    </div>
  )
}

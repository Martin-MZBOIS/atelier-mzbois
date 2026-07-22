import { useEffect, useMemo, useState } from 'react'
import SelectSearch from '../components/SelectSearch'
import EmptyState from '../components/EmptyState'
import { SkelList } from '../components/Skeleton'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store'
import { formatDate } from '../lib/format'
import { STATUT_COURSE, STATUT_COURSE_ORDER, resolve } from '../lib/statuts'
import CourseModal from './CourseModal'

export default function ChantierCoursesTab() {
  const { chantier } = useOutletContext()
  const user = useAuthStore((s) => s.user)
  const [courses, setCourses] = useState([])
  const [employes, setEmployes] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [chantiers, setChantiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editCourse, setEditCourse] = useState(null)

  async function loadCourses() {
    const full =
      'id, date, heure_depart, type_course, etapes, ouvrage_ids, de_libelle, vers_libelle, ' +
      'cout_ht, chantier_impute_id, ' +
      'statut, qui_id, qui_type, de_id, vers_id, quoi, commentaire, chantier_id'
    const core = 'id, date, statut, qui_id, qui_type, de_id, vers_id, quoi, commentaire, chantier_id'
    let { data, error: dbError } = await supabase
      .from('courses').select(full).eq('chantier_id', chantier.id).order('date', { ascending: true })
    if (dbError && /(type_course|etapes|ouvrage_ids|de_libelle|vers_libelle|heure_depart|cout_ht|chantier_impute_id)/.test(dbError.message)) {
      ;({ data, error: dbError } = await supabase
        .from('courses').select(core).eq('chantier_id', chantier.id).order('date', { ascending: true }))
    }
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

      {loading && <SkelList rows={4} />}
      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}
      {!loading && !error && courses.length === 0 && (
        <EmptyState ico="🚚" titre="Aucune course" aide="Planifiez une livraison ou une ramasse pour ce chantier." />
      )}

      <div className="course-list">
        {courses.map((c) => {
          const st = resolve(STATUT_COURSE, c.statut)
          return (
            <div key={c.id} className="course-card course-card--click" style={{ borderLeftColor: st.color }} onClick={() => setEditCourse(c)} title="Modifier la course">
              <div className="course-top">
                <div className="course-top-left">
                  <span className="course-date mono">{formatDate(c.date)}</span>
                  {c.type_course && <span className="course-type-badge">{c.type_course === 'ramasse' ? '📥' : c.type_course === 'tournee' ? '🔄' : '🚚'}</span>}
                  <span className="aspill" style={{ color: st.color, backgroundColor: st.color + '22' }}>
                    {st.label}
                  </span>
                </div>
                <div className="course-top-right" onClick={(e) => e.stopPropagation()}>
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
                  <SelectSearch
                    className="ss"
                    value={c.statut ?? ''}
                    onChange={(v) => changeStatut(c.id, v)}
                    allowEmpty={c.statut == null}
                    options={STATUT_COURSE_ORDER.map((slug) => ({
                      value: slug,
                      label: STATUT_COURSE[slug].label,
                    }))}
                  />
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
          fournisseurs={fournisseurs}
          user={user}
          defaultChantierId={chantier.id}
          onClose={() => setShowModal(false)}
          onSaved={async () => {
            setShowModal(false)
            await loadCourses()
          }}
        />
      )}
      {editCourse && (
        <CourseModal
          chantiers={chantiers}
          employes={employes}
          transporteurs={transporteurs}
          fournisseurs={fournisseurs}
          user={user}
          course={editCourse}
          defaultChantierId={chantier.id}
          onClose={() => setEditCourse(null)}
          onSaved={async () => {
            setEditCourse(null)
            await loadCourses()
          }}
        />
      )}
    </div>
  )
}

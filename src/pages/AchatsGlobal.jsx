import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  TYP_ACHAT,
  TYP_ACHAT_ORDER,
  STATUT_ACHAT,
  resolve,
} from '../lib/statuts'
import AchatModal from './AchatModal'

// Filtres rapides : regroupent des statuts (slugs).
const QUICK_FILTERS = [
  { id: 'tous', label: 'Tous', color: '#2c2420', match: () => true },
  {
    id: 'traiter',
    label: 'À traiter',
    color: '#8a7040',
    match: (st) => ['a_traiter', 'a_commander'].includes(st),
  },
  {
    id: 'liv',
    label: 'En livraison',
    color: '#4a6b8a',
    match: (st) =>
      ['en_cours_livraison', 'recu_partiellement', 'non_conforme'].includes(st),
  },
  {
    id: 'recu',
    label: 'Reçu / Dispo',
    color: '#5a7a5a',
    match: (st) => ['recu', 'en_stock'].includes(st),
  },
]

function StatutPill({ slug }) {
  const s = resolve(STATUT_ACHAT, slug)
  return (
    <span
      className="aspill"
      style={{ color: s.color, backgroundColor: s.color + '22' }}
    >
      {s.label}
    </span>
  )
}

export default function AchatsGlobal() {
  const [achats, setAchats] = useState([])
  const [chantiers, setChantiers] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quick, setQuick] = useState(location.state?.quick ?? 'tous')
  const [typ, setTyp] = useState('tous')
  const [modal, setModal] = useState(null)

  async function loadAchats() {
    const { data, error: dbError } = await supabase
      .from('achats')
      .select(
        'id, chantier_id, nom, ref, typ, fournisseur_id, dtl, qty, stk, acmd, st, prix_u, mht, ' +
          'fournisseur:fournisseurs!fournisseur_id(nom), ' +
          'chantier:chantiers!chantier_id(num, nom)'
      )
      .order('nom', { ascending: true })
    if (dbError) {
      setError(dbError.message)
      setAchats([])
    } else {
      setAchats(data ?? [])
    }
  }

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const [, ch, fo] = await Promise.all([
        loadAchats(),
        supabase.from('chantiers').select('id, num, nom').order('num'),
        supabase.from('fournisseurs').select('id, nom').order('nom'),
      ])
      if (!active) return
      setChantiers(ch.data ?? [])
      setFournisseurs(fo.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const counts = useMemo(() => {
    const c = {}
    for (const f of QUICK_FILTERS) {
      c[f.id] = achats.filter((a) => f.match(a.st)).length
    }
    return c
  }, [achats])

  const filtered = useMemo(() => {
    const qf = QUICK_FILTERS.find((f) => f.id === quick) ?? QUICK_FILTERS[0]
    return achats.filter(
      (a) => qf.match(a.st) && (typ === 'tous' || (a.typ ?? 'divers') === typ)
    )
  }, [achats, quick, typ])

  return (
    <section className="page">
      <div className="page-head">
        <h2>Achats</h2>
        <span className="page-count">
          {loading ? '' : `${achats.length} achat(s)`}
        </span>
        <button
          className="btn bp bsm"
          style={{ marginLeft: 'auto' }}
          onClick={() => setModal({ achat: null })}
        >
          + Nouvel achat
        </button>
      </div>

      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {/* Filtres rapides */}
      <div className="qf-row">
        {QUICK_FILTERS.map((f) => {
          const on = quick === f.id
          return (
            <button
              key={f.id}
              className="qf"
              style={{
                background: on ? f.color + '22' : 'var(--g5)',
                borderColor: on ? f.color : 'var(--g4)',
                color: on ? f.color : 'var(--g1)',
              }}
              onClick={() => setQuick(f.id)}
            >
              {f.label}
              <span
                className="qf-count"
                style={{
                  background: on ? f.color : 'var(--g4)',
                  color: on ? '#fff' : 'var(--g1)',
                }}
              >
                {counts[f.id] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      <div className="qf-typ">
        <select value={typ} onChange={(e) => setTyp(e.target.value)}>
          <option value="tous">Toutes typologies</option>
          {TYP_ACHAT_ORDER.map((slug) => (
            <option key={slug} value={slug}>
              {TYP_ACHAT[slug].label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table striped">
            <thead>
              <tr>
                <th>Type</th>
                <th>Article</th>
                <th>Fournisseur</th>
                <th>Qté/Stk/Cmd</th>
                <th>Détail</th>
                <th>Chantier</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const t = a.typ ? TYP_ACHAT[a.typ] : null
                return (
                  <tr
                    key={a.id}
                    className="row-link"
                    onClick={() => setModal({ achat: a })}
                  >
                    <td>
                      {t && <span className={'typbdg ' + t.cls}>{t.label}</span>}
                    </td>
                    <td className="strong">{a.nom || a.ref}</td>
                    <td>{a.fournisseur?.nom ?? '—'}</td>
                    <td className="mono">
                      {a.qty ?? 0}/{a.stk ?? 0}/<strong>{a.acmd ?? 0}</strong>
                    </td>
                    <td>{a.dtl ?? '—'}</td>
                    <td className="mono ac-chantier">{a.chantier?.num ?? '—'}</td>
                    <td>
                      <StatutPill slug={a.st} />
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty">
                    Aucun achat pour ce filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <AchatModal
          chantiers={chantiers}
          fournisseurs={fournisseurs}
          achat={modal.achat}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null)
            await loadAchats()
          }}
        />
      )}
    </section>
  )
}

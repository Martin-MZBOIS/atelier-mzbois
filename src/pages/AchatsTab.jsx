import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { SkelList } from '../components/Skeleton'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import { toast } from '../store/toasts'
import { formatEuro } from '../lib/format'
import {
  TYP_ACHAT,
  TYP_ACHAT_ORDER,
  STATUT_ACHAT,
  STATUT_ACHAT_ORDER,
  resolve,
} from '../lib/statuts'
import AchatModal from './AchatModal'

// Pastille de statut (fond = couleur à ~13% d'opacité, comme la maquette).
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

export default function AchatsTab() {
  const { chantier } = useOutletContext()
  const [achats, setAchats] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const [modal, setModal] = useState(null) // { achat } | { achat: null } | null

  async function loadAchats() {
    const { data, error: dbError } = await supabase
      .from('achats')
      .select(
        'id, nom, ref, typ, fournisseur_id, dtl, qty, stk, acmd, st, prix_u, mht, ' +
          'fournisseur:fournisseurs!fournisseur_id(nom)'
      )
      .eq('chantier_id', chantier.id)
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
      const [, fourn] = await Promise.all([
        loadAchats(),
        supabase.from('fournisseurs').select('id, nom').order('nom'),
      ])
      if (!active) return
      setFournisseurs(fourn.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantier.id])

  // Temps réel : réception/statut d'achats de ce chantier.
  useRealtime('achats', loadAchats, { filter: `chantier_id=eq.${chantier.id}` })

  async function changeStatut(achatId, newStatut, e) {
    e.stopPropagation()
    const previous = achats
    setAchats((prev) =>
      prev.map((a) => (a.id === achatId ? { ...a, st: newStatut } : a))
    )
    const { error: dbError } = await supabase
      .from('achats')
      .update({ st: newStatut })
      .eq('id', achatId)
    if (dbError) {
      setAchats(previous)
      setError('Échec de la mise à jour : ' + dbError.message)
      toast.error('Statut non enregistré : ' + dbError.message)
    } else {
      toast('Statut mis à jour')
    }
  }

  function toggle(typ) {
    setCollapsed((c) => ({ ...c, [typ]: !c[typ] }))
  }

  // Regroupe par typologie (null -> divers), dans l'ordre défini.
  const groups = TYP_ACHAT_ORDER.map((typ) => ({
    typ,
    items: achats.filter((a) => (a.typ ?? 'divers') === typ),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <span className="card-title">Achats</span>
          <span className="card-count">{loading ? '' : achats.length}</span>
        </div>
        <button
          className="btn bg bsm"
          onClick={() => setModal({ achat: null })}
        >
          + Ajouter
        </button>
      </div>

      {loading && <SkelList rows={5} />}
      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}
      {!loading && !error && achats.length === 0 && (
        <EmptyState ico="📦" titre="Aucun achat" aide="Les achats saisis ici alimentent le suivi budgétaire du chantier." />
      )}

      {groups.map(({ typ, items }) => {
        const meta = TYP_ACHAT[typ]
        const isCollapsed = collapsed[typ]
        const needsOrder = items.some((a) => a.st === 'a_commander')
        return (
          <div key={typ} className="achat-group">
            <div className="achat-group-head" onClick={() => toggle(typ)}>
              <span className="chev">{isCollapsed ? '▸' : '▾'}</span>
              <span className={'typbdg ' + meta.cls}>{meta.label}</span>
              <span className="achat-group-count">{items.length}</span>
              {needsOrder && (
                <span className="achat-warn">⚠ à commander</span>
              )}
            </div>

            {!isCollapsed && (
              <div className="achat-group-body">
                {items.map((a) => (
                  <div
                    key={a.id}
                    className={'ac' + (a.st === 'recu' ? ' ac--ok' : '')}
                    onClick={() => setModal({ achat: a })}
                  >
                    <div className="ac-main">
                      <div className="ac-title-row">
                        <span className="ac-name mono">{a.nom || a.ref}</span>
                        {a.fournisseur && (
                          <span className="ac-fourn">{a.fournisseur.nom}</span>
                        )}
                      </div>
                      <div className="ac-meta">
                        Qté&nbsp;: {a.qty ?? 0} · Stock&nbsp;: {a.stk ?? 0} · À
                        cmd&nbsp;: <strong>{a.acmd ?? 0}</strong>
                        {a.prix_u != null && (
                          <> · {formatEuro(a.prix_u)}/u</>
                        )}
                        {a.dtl ? ' · ' + a.dtl : ''}
                      </div>
                    </div>
                    <div className="ac-side">
                      <StatutPill slug={a.st} />
                      <select
                        className="ss"
                        value={a.st ?? ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => changeStatut(a.id, e.target.value, e)}
                      >
                        {a.st == null && <option value="">—</option>}
                        {STATUT_ACHAT_ORDER.map((slug) => (
                          <option key={slug} value={slug}>
                            {STATUT_ACHAT[slug].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {modal && (
        <AchatModal
          chantierId={chantier.id}
          fournisseurs={fournisseurs}
          achat={modal.achat}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null)
            await loadAchats()
          }}
        />
      )}
    </div>
  )
}

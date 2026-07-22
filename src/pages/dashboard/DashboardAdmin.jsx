import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store'
import { useSettings } from '../../store/settings'
import { logModif } from '../../lib/historique'
import { CLOS, eur } from '../../lib/dashboard'
import { formatDateTime } from '../../lib/format'
import DashHeader from './DashHeader'

// Un chantier est « à facturer » quand tous ses ouvrages sont clos et qu'au
// moins un est au statut `termine` (donc pas encore `facture`).
function aFacturer(statuts) {
  return statuts.length > 0 && statuts.every((s) => CLOS.includes(s)) && statuts.includes('termine')
}

export default function DashboardAdmin() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const coutH = useSettings((s) => s.cout_horaire)

  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [saisie, setSaisie] = useState({}) // { [id]: { montant, chantierId } }

  const load = useCallback(async () => {
    const [ch, ouv, ach, cou, hist] = await Promise.all([
      supabase
        .from('chantiers')
        .select('id, num, client, heures_vendues, fournitures_vendues')
        .order('num'),
      supabase.from('ouvrages').select('id, statut, sit_pct, chantier_id'),
      supabase
        .from('achats')
        .select('id, nom, st, mht, chantier:chantiers!chantier_id(id, num)')
        .eq('st', 'recu'),
      supabase
        .from('courses')
        .select('id, date, quoi, statut, cout_ht, chantier_id, chantier:chantiers!chantier_id(id, num)')
        .eq('statut', 'faite'),
      supabase
        .from('historique_modifications')
        .select('id, table_name, champ, ancienne_valeur, nouvelle_valeur, modifie_le, chantier:chantiers!chantier_id(num)')
        .order('modifie_le', { ascending: false })
        .limit(8),
    ])
    const err = [ch, ouv, ach].find((r) => r.error)
    if (err) {
      setError(err.error.message)
      return
    }
    setD({
      chantiers: ch.data ?? [],
      ouvrages: ouv.data ?? [],
      achatsRecus: ach.data ?? [],
      courses: cou.error ? [] : cou.data ?? [],
      historique: hist.error ? [] : hist.data ?? [],
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (error)
    return (
      <section className="page">
        <div className="alert"><strong>Erreur :</strong> {error}</div>
      </section>
    )
  if (!d)
    return (
      <section className="page">
        <p className="muted">Chargement…</p>
      </section>
    )

  const ouvParChantier = {}
  for (const o of d.ouvrages) (ouvParChantier[o.chantier_id] ??= []).push(o)

  const chantiersAFacturer = d.chantiers.filter((c) =>
    aFacturer((ouvParChantier[c.id] ?? []).map((o) => o.statut))
  )
  const achatsSansMontant = d.achatsRecus.filter((a) => a.mht == null || Number(a.mht) === 0)
  const coursesSansCout = d.courses.filter((c) => c.cout_ht == null)

  const alertes = []
  if (chantiersAFacturer.length)
    alertes.push({
      ico: '💰',
      txt: `${chantiersAFacturer.length} chantier${chantiersAFacturer.length > 1 ? 's' : ''} terminé${chantiersAFacturer.length > 1 ? 's' : ''} non facturé${chantiersAFacturer.length > 1 ? 's' : ''}`,
    })
  if (achatsSansMontant.length)
    alertes.push({
      ico: '💶', tone: 'orange',
      txt: `${achatsSansMontant.length} achat${achatsSansMontant.length > 1 ? 's' : ''} reçu${achatsSansMontant.length > 1 ? 's' : ''} sans montant HT`,
    })
  if (coursesSansCout.length)
    alertes.push({
      ico: '🚚', tone: 'orange',
      txt: `${coursesSansCout.length} course${coursesSansCout.length > 1 ? 's' : ''} faite${coursesSansCout.length > 1 ? 's' : ''} sans coût imputé`,
    })

  // Montant vendu estimé : mêmes conventions que l'onglet Analytique
  // (heures vendues valorisées au coût horaire + fournitures vendues).
  function montantVendu(c) {
    return (Number(c.heures_vendues) || 0) * coutH + (Number(c.fournitures_vendues) || 0)
  }
  function situationPct(cid) {
    const ovs = ouvParChantier[cid] ?? []
    if (ovs.length === 0) return 0
    const tot = ovs.reduce((s, o) => s + (Number(o.sit_pct) || 0), 0)
    return Math.round(tot / ovs.length)
  }

  async function marquerFacture(c) {
    setBusy('ch-' + c.id)
    const { error: e } = await supabase
      .from('ouvrages')
      .update({ statut: 'facture', fact_def: true })
      .eq('chantier_id', c.id)
      .eq('statut', 'termine')
    if (!e)
      await logModif({
        table: 'chantiers', champ: 'facturation',
        ancienne: 'terminé', nouvelle: 'facturé',
        chantierId: c.id, user,
      })
    setBusy(null)
    if (e) setError(e.message)
    else await load()
  }

  async function saveMontantAchat(a) {
    const v = saisie['a' + a.id]?.montant
    if (v == null || v === '') return
    setBusy('a-' + a.id)
    const { error: e } = await supabase
      .from('achats')
      .update({ mht: Number(v) })
      .eq('id', a.id)
    if (!e)
      await logModif({
        table: 'achats', champ: 'montant HT',
        ancienne: a.mht, nouvelle: v,
        chantierId: a.chantier?.id, user,
      })
    setBusy(null)
    if (e) setError(e.message)
    else {
      setSaisie((s) => ({ ...s, ['a' + a.id]: {} }))
      await load()
    }
  }

  async function saveCourse(c) {
    const s = saisie['c' + c.id] ?? {}
    if (s.montant == null || s.montant === '') return
    setBusy('c-' + c.id)
    const patch = { cout_ht: Number(s.montant) }
    if (s.chantierId) patch.chantier_impute_id = s.chantierId
    const { error: e } = await supabase.from('courses').update(patch).eq('id', c.id)
    if (!e) {
      await logModif({
        table: 'courses', champ: 'coût course (HT)',
        ancienne: c.cout_ht, nouvelle: s.montant,
        chantierId: s.chantierId ?? c.chantier_id, user,
      })
      if (s.chantierId)
        await logModif({
          table: 'courses', champ: 'chantier imputé',
          ancienne: null, nouvelle: s.chantierId,
          chantierId: s.chantierId, user,
        })
    }
    setBusy(null)
    if (e) setError(e.message)
    else {
      setSaisie((st) => ({ ...st, ['c' + c.id]: {} }))
      await load()
    }
  }

  const setField = (key, field, value) =>
    setSaisie((s) => ({ ...s, [key]: { ...(s[key] ?? {}), [field]: value } }))

  return (
    <section className="page">
      <DashHeader />

      {alertes.length > 0 && (
        <div className="dash-alerts">
          {alertes.map((a, i) => (
            <div
              key={i}
              className={'dash-alert dash-alert--static' + (a.tone === 'orange' ? ' dash-alert--orange' : '')}
            >
              {a.ico} <span>{a.txt}</span>
            </div>
          ))}
        </div>
      )}

      <div className="dash-grid">
        {/* À facturer */}
        <div className="card dash-full">
          <div className="card-head">
            <span className="card-title">
              💰 À facturer <span className="card-count">{chantiersAFacturer.length}</span>
            </span>
          </div>
          <div className="param-hint" style={{ marginBottom: 6 }}>
            Reste à facturer estimé : montant vendu (heures × coût horaire + fournitures)
            diminué de l'avancement de la situation.
          </div>
          {chantiersAFacturer.length === 0 ? (
            <div className="empty">Aucun chantier à facturer</div>
          ) : (
            chantiersAFacturer.map((c) => {
              const pct = situationPct(c.id)
              const reste = montantVendu(c) * (1 - pct / 100)
              return (
                <div key={c.id} className="dash-line dash-line--static">
                  <div className="dash-line-body">
                    <div className="dash-line-lbl">
                      <span className="mono">{c.num}</span> · {c.client}
                    </div>
                    <div className="dash-line-sub">
                      Situation {pct}% · Reste à facturer {eur(reste)}
                    </div>
                  </div>
                  <button
                    className="btn bp bsm"
                    disabled={busy === 'ch-' + c.id}
                    onClick={() => marquerFacture(c)}
                  >
                    {busy === 'ch-' + c.id ? '…' : 'Marquer facturé'}
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Achats reçus sans montant */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">
              📦 Achats reçus sans montant{' '}
              <span className="card-count">{achatsSansMontant.length}</span>
            </span>
            <button className="btn bg bsm" onClick={() => navigate('/achats')}>
              Voir tout →
            </button>
          </div>
          {achatsSansMontant.length === 0 ? (
            <div className="empty">Tous les achats reçus sont pointés</div>
          ) : (
            achatsSansMontant.map((a) => (
              <div key={a.id} className="dash-line dash-line--static">
                <div className="dash-line-body">
                  <div className="dash-line-lbl">{a.nom}</div>
                  <div className="dash-line-sub">
                    <span className="mono">{a.chantier?.num}</span>
                  </div>
                </div>
                <input
                  className="admin-inp"
                  type="number"
                  step="0.01"
                  placeholder="€ HT"
                  value={saisie['a' + a.id]?.montant ?? ''}
                  onChange={(e) => setField('a' + a.id, 'montant', e.target.value)}
                />
                <button
                  className="btn bp bsm"
                  disabled={busy === 'a-' + a.id}
                  onClick={() => saveMontantAchat(a)}
                >
                  OK
                </button>
              </div>
            ))
          )}
        </div>

        {/* Courses à imputer */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">
              🚚 Courses à imputer <span className="card-count">{coursesSansCout.length}</span>
            </span>
            <button className="btn bg bsm" onClick={() => navigate('/courses')}>
              Voir tout →
            </button>
          </div>
          {coursesSansCout.length === 0 ? (
            <div className="empty">Toutes les courses faites sont imputées</div>
          ) : (
            coursesSansCout.map((c) => (
              <div key={c.id} className="dash-line dash-line--static">
                <div className="dash-line-body">
                  <div className="dash-line-lbl">{c.quoi || 'Course'}</div>
                  <div className="dash-line-sub">
                    <span className="mono">{c.chantier?.num ?? '—'}</span>
                  </div>
                </div>
                <input
                  className="admin-inp"
                  type="number"
                  step="0.01"
                  placeholder="€ HT"
                  value={saisie['c' + c.id]?.montant ?? ''}
                  onChange={(e) => setField('c' + c.id, 'montant', e.target.value)}
                />
                <select
                  className="ss"
                  value={saisie['c' + c.id]?.chantierId ?? c.chantier_id ?? ''}
                  onChange={(e) => setField('c' + c.id, 'chantierId', e.target.value)}
                >
                  <option value="">Chantier…</option>
                  {d.chantiers.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.num}</option>
                  ))}
                </select>
                <button
                  className="btn bp bsm"
                  disabled={busy === 'c-' + c.id}
                  onClick={() => saveCourse(c)}
                >
                  OK
                </button>
              </div>
            ))
          )}
        </div>

        {/* Historique des modifications */}
        <div className="card dash-full">
          <div className="card-head">
            <span className="card-title">📋 Historique des modifications</span>
          </div>
          {d.historique.length === 0 ? (
            <div className="empty">Aucune modification enregistrée</div>
          ) : (
            d.historique.map((h) => (
              <div key={h.id} className="dash-line dash-line--static">
                <div className="dash-line-body">
                  <div className="dash-line-lbl">
                    {h.table_name} · {h.champ}
                    {h.chantier?.num ? ' · ' : ''}
                    {h.chantier?.num && <span className="mono">{h.chantier.num}</span>}
                  </div>
                  <div className="dash-line-sub">
                    {(h.ancienne_valeur ?? '—') + ' → ' + (h.nouvelle_valeur ?? '—')}
                  </div>
                </div>
                <div className="dash-line-sub">{formatDateTime(h.modifie_le)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

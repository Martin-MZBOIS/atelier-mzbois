import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AnalytiqueModal from './AnalytiqueModal'

// Coût horaire moyen (€/h) — paramètre global (configurable plus tard).
const COUT_H = 45

function eur(n) {
  return Math.round(n).toLocaleString('fr-FR') + ' €'
}

// Parse un export CSV ProGbat (séparateur ';', encodage windows-1252).
// Mapping : MO ET -> heures réalisées, MO FAB -> heures vendues,
//           « Total Fournitures » -> fournitures vendues.
function parseProGbat(text) {
  const lines = text.split('\n')
  let fv = 0
  let hv = 0
  let hr = 0
  for (const line of lines) {
    const parts = line.split(';')
    if (parts.length < 2) continue
    const qty = parseFloat((parts[3] || '').replace(',', '.'))
    if (line.includes('Total Fournitures')) {
      const v = parseFloat(
        (parts[parts.length - 1] || '').replace(',', '.').replace(/\s/g, '')
      )
      if (!Number.isNaN(v)) fv = v
    }
    if (parts[1] === 'MO ET' && !Number.isNaN(qty)) hr += qty
    if (parts[1] === 'MO FAB' && !Number.isNaN(qty)) hv += qty
  }
  return { fv, hv, hr }
}

function Bar({ pct, color }) {
  return (
    <div className="ana-bar">
      <div className="ana-fill" style={{ width: pct + '%', background: color }} />
    </div>
  )
}

export default function AnalytiqueTab() {
  const { chantier } = useOutletContext()
  const [ana, setAna] = useState(null)
  const [achHT, setAchHT] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  async function load() {
    setError('')
    const [ch, ach] = await Promise.all([
      supabase
        .from('chantiers')
        .select('heures_vendues, heures_realisees, fournitures_vendues')
        .eq('id', chantier.id)
        .single(),
      supabase.from('achats').select('mht').eq('chantier_id', chantier.id),
    ])
    if (ch.error) {
      setError(ch.error.message)
      setAna(null)
    } else {
      setAna(ch.data)
    }
    const total = (ach.data ?? []).reduce((s, a) => s + (Number(a.mht) || 0), 0)
    setAchHT(total)
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantier.id])

  async function handleCsv(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportMsg('')
    try {
      const buf = await file.arrayBuffer()
      const text = new TextDecoder('windows-1252').decode(buf)
      const { fv, hv, hr } = parseProGbat(text)
      if (!fv && !hv && !hr) {
        setImportMsg('Aucune donnée exploitable dans ce CSV.')
        return
      }
      const patch = {}
      if (fv) patch.fournitures_vendues = fv
      if (hv) patch.heures_vendues = hv
      if (hr) patch.heures_realisees = hr
      const { error: dbError } = await supabase
        .from('chantiers')
        .update(patch)
        .eq('id', chantier.id)
      if (dbError) {
        setImportMsg('Échec : ' + dbError.message)
        return
      }
      setImportMsg(
        `Import réussi — Fournitures : ${eur(fv)} · H. étude : ${hr}h · H. fab. : ${hv}h`
      )
      await load()
    } catch (err) {
      setImportMsg('Erreur de lecture : ' + (err.message ?? err))
    } finally {
      e.target.value = ''
    }
  }

  if (loading) return <div className="card"><p className="muted">Chargement…</p></div>
  if (error)
    return (
      <div className="card">
        <div className="alert">
          <strong>Erreur :</strong> {error}
          {error.includes('heures_vendues') && (
            <div className="alert-sub">
              Exécute la migration{' '}
              <code>supabase/migrations/0004_chantier_analytique.sql</code> dans
              Supabase.
            </div>
          )}
        </div>
      </div>
    )

  const hv = Number(ana.heures_vendues) || 0
  const hr = Number(ana.heures_realisees) || 0
  const fv = Number(ana.fournitures_vendues) || 0
  const coutHR = hr * COUT_H
  const marge = (hv * COUT_H + fv) - (coutHR + achHT)
  const pH = hv > 0 ? Math.min(100, Math.round((hr / hv) * 100)) : 0
  const pF = fv > 0 ? Math.min(100, Math.round((achHT / fv) * 100)) : 0
  const barH = pH > 100 ? 'var(--rd)' : pH > 85 ? '#8a7040' : 'var(--gn)'
  const barF = pF > 100 ? 'var(--rd)' : pF > 85 ? '#8a7040' : 'var(--gn)'

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">📊 Analytique</span>
        <div className="card-actions">
          <button className="btn bg bsm" onClick={() => setShowEdit(true)}>
            ✏ Modifier
          </button>
          <label className="btn bg bsm" style={{ cursor: 'pointer' }}>
            📂 Import CSV
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsv} />
          </label>
        </div>
      </div>

      <div className="ana-costline">
        Coût horaire moyen : {COUT_H} €/h
      </div>
      {importMsg && <div className="ana-import">{importMsg}</div>}

      <div className="dg2">
        <div className="ana-box">
          <div className="ana-box-title">⏱ HEURES</div>
          <div className="ana-row">
            <span>Vendues</span>
            <span className="strong">{hv}h</span>
          </div>
          <div className="ana-row">
            <span>Réalisées</span>
            <span className="strong" style={{ color: hr > hv ? 'var(--rd)' : 'var(--gn)' }}>
              {hr}h
            </span>
          </div>
          <Bar pct={pH} color={barH} />
          <div className="ana-sub">{pH}% · Valeur : {eur(coutHR)}</div>
        </div>

        <div className="ana-box">
          <div className="ana-box-title">🪵 FOURNITURES</div>
          <div className="ana-row">
            <span>Vendues</span>
            <span className="strong">{eur(fv)}</span>
          </div>
          <div className="ana-row">
            <span>Achetées</span>
            <span className="strong" style={{ color: achHT > fv ? 'var(--rd)' : 'var(--gn)' }}>
              {eur(achHT)}
            </span>
          </div>
          <Bar pct={pF} color={barF} />
        </div>
      </div>

      <div className={'ana-result ' + (marge >= 0 ? 'ana-result--pos' : 'ana-result--neg')}>
        <div className="ana-result-lbl">RÉSULTAT ESTIMÉ</div>
        <div className="ana-result-val">
          {marge >= 0 ? '+' : ''}
          {eur(marge)}
        </div>
      </div>

      {showEdit && (
        <AnalytiqueModal
          chantierId={chantier.id}
          initial={ana}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false)
            await load()
          }}
        />
      )}
    </div>
  )
}

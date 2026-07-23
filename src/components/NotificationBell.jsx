import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import { useAuthStore } from '../store'
import { useMonEmploye } from '../lib/useMonEmploye'
import { daysUntil, daysUntilAnniv, isoDay } from '../lib/dashboard'

// Cloche de notifications (sidebar).
//
// Une NOTIFICATION informe d'un évènement qui me concerne ; elle n'appelle pas
// forcément une action de ma part. À distinguer des ALERTES du tableau de bord,
// qui signalent une action à faire et disparaissent une fois celle-ci faite.
//
// Ne notifient volontairement JAMAIS : les nouveaux messages du fil d'actualité,
// les changements de statut, et les achats / courses des autres.
export default function NotificationBell() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isDir = user?.role === 'dir'
  const { employeId } = useMonEmploye()

  const [groups, setGroups] = useState([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const load = useCallback(async () => {
    const next = []

    if (isDir) {
      // ----- Dirigeant -----
      const sig = await supabase
        .from('signalements')
        .select('id, type, description')
        .eq('statut', 'en_attente')
      if (!sig.error && sig.data?.length)
        next.push({
          key: 'signalements', icon: '🐞', label: 'Signalements Assistance',
          items: sig.data.map((s) => ({
            id: s.id, text: s.description,
            sub: s.type === 'idee' ? 'idée' : 'problème',
            path: '/assistance',
          })),
        })

      const idees = await supabase
        .from('copil_sujets')
        .select('id, titre, type')
        .eq('statut', 'boite')
      if (!idees.error && idees.data?.length)
        next.push({
          key: 'idees', icon: '💡', label: 'Boîte à idées COPIL',
          items: idees.data.map((s) => ({
            id: s.id, text: s.titre, sub: s.type, path: `/copil?o=${s.type}`,
          })),
        })

      // Action COPIL non faite alors que la date de réunion est passée.
      const actions = await supabase
        .from('copil_actions')
        .select('id, texte, reunion:copil_reunions!reunion_id(date, type)')
        .eq('done', false)
      if (!actions.error) {
        const enRetard = (actions.data ?? []).filter(
          (a) => a.reunion?.date && daysUntil(a.reunion.date) < 0
        )
        if (enRetard.length)
          next.push({
            key: 'copil-retard', icon: '⏳', label: 'Actions COPIL en retard',
            items: enRetard.map((a) => ({
              id: a.id, text: a.texte, sub: a.reunion?.type,
              path: `/copil?o=${a.reunion?.type ?? 'chantiers'}`,
            })),
          })
      }

      // Pas d'alerte sur les feedbacks : ils ont leur poste de triage dédié
      // (page Feedbacks, chapitre Organisation), où ils sont assignés à
      // quelqu'un. Les remonter aussi dans la cloche ferait un rappel de plus
      // pour un travail qui a déjà son propriétaire.

      // Anniversaires : personnel 7 jours avant, entreprise le jour J.
      let emp = await supabase.from('employes').select('id, prenom, date_naissance, date_entree')
      if (emp.error) emp = { data: [] }
      const annivs = []
      for (const e of emp.data ?? []) {
        const dn = daysUntilAnniv(e.date_naissance)
        if (dn != null && dn >= 0 && dn <= 7)
          annivs.push({
            id: 'n' + e.id,
            text:
              dn === 0
                ? `Anniversaire de ${e.prenom} aujourd'hui !`
                : `Anniversaire de ${e.prenom} dans ${dn} jour${dn > 1 ? 's' : ''}`,
            path: '/contacts',
          })
        const de = daysUntilAnniv(e.date_entree)
        if (de === 0 && e.date_entree) {
          const ans = new Date().getFullYear() - new Date(e.date_entree).getFullYear()
          if (ans > 0)
            annivs.push({
              id: 'e' + e.id,
              text: `${e.prenom} fête ses ${ans} an${ans > 1 ? 's' : ''} chez MZ Bois !`,
              path: '/contacts',
            })
        }
      }
      if (annivs.length)
        next.push({ key: 'anniv', icon: '🎂', label: 'Anniversaires', items: annivs })
    } else if (employeId) {
      // ----- Collaborateurs -----
      const tach = await supabase
        .from('taches')
        .select('id, texte, echeance, chantier:chantiers!chantier_id(num)')
        .eq('assigne_a', employeId)
        .eq('done', false)
      if (!tach.error && tach.data?.length) {
        next.push({
          key: 'taches', icon: '✅', label: 'Tâches qui vous sont assignées',
          items: tach.data.map((t) => ({
            id: t.id, text: t.texte, sub: t.chantier?.num, path: '/dashboard',
          })),
        })
        // Échéance proche : aujourd'hui ou demain.
        const today = isoDay()
        const proches = tach.data.filter(
          (t) => t.echeance && t.echeance >= today && daysUntil(t.echeance) <= 1
        )
        if (proches.length)
          next.push({
            key: 'echeance', icon: '⏰', label: 'Échéance proche',
            items: proches.map((t) => ({
              id: 'e' + t.id, text: t.texte,
              sub: daysUntil(t.echeance) <= 0 ? "aujourd'hui" : 'demain',
              path: '/dashboard',
            })),
          })
      }

      const actions = await supabase
        .from('copil_actions')
        .select('id, texte, reunion:copil_reunions!reunion_id(type)')
        .eq('assigne_a', employeId)
        .eq('done', false)
      if (!actions.error && actions.data?.length)
        next.push({
          key: 'copil', icon: '📋', label: 'Actions COPIL assignées',
          items: actions.data.map((a) => ({
            id: a.id, text: a.texte, sub: a.reunion?.type,
            path: `/copil?o=${a.reunion?.type ?? 'chantiers'}`,
          })),
        })
    }

    setGroups(next)
  }, [isDir, employeId])

  useEffect(() => {
    load()
  }, [load])

  // Temps réel sur les sources les plus mouvantes.
  useRealtime('taches', load, { enabled: !isDir })
  useRealtime('signalements', load, { enabled: isDir })
  useRealtime('copil_sujets', load, { enabled: isDir })

  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const total = groups.reduce((n, g) => n + g.items.length, 0)

  function go(path) {
    setOpen(false)
    navigate(path)
  }

  return (
    <div className="notif" ref={wrapRef}>
      <button className="notif-btn" onClick={() => setOpen((o) => !o)} title="Notifications">
        🔔
        {total > 0 && <span className="notif-badge">{total > 99 ? '99+' : total}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">Notifications</div>
          {total === 0 && <div className="notif-empty">Rien à signaler 🎉</div>}
          {groups.map((g) => (
            <div key={g.key} className="notif-group">
              <div className="notif-group-head">
                <span>{g.icon}</span>
                <span>{g.label}</span>
                <span className="notif-group-count">{g.items.length}</span>
              </div>
              {g.items.slice(0, 6).map((it) => (
                <button key={it.id} className="notif-item" onClick={() => go(it.path)}>
                  <span className="notif-item-text">{it.text}</span>
                  {it.sub && <span className="notif-item-sub">{it.sub}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import { useAuthStore } from '../store'

// Cloche de notifications (sidebar) : agrège les alertes selon le rôle et
// les regroupe par type. Compteur = nombre total d'éléments en attente.
export default function NotificationBell() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const uid = user?.id
  const role = user?.role
  const [groups, setGroups] = useState([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const load = useCallback(async () => {
    if (!uid) return
    const next = []

    // Mes tâches non terminées (tous rôles).
    const tach = await supabase
      .from('taches')
      .select('id, texte, chantier:chantiers!chantier_id(id, num)')
      .eq('assigne_a', uid)
      .eq('done', false)
    if (!tach.error && tach.data?.length) {
      next.push({
        key: 'taches',
        icon: '✅',
        label: 'Mes tâches',
        items: tach.data.map((t) => ({
          id: t.id,
          text: t.texte,
          sub: t.chantier?.num,
          path: '/dashboard#taches',
        })),
      })
    }

    // Réservé au Dirigeant : feedbacks remontés + messages d'assistance non lus.
    if (role === 'dir') {
      const fb = await supabase
        .from('feedbacks')
        .select('id, description, chantier:chantiers!chantier_id(id, num)')
        .eq('statut', 'remonte')
      if (!fb.error && fb.data?.length) {
        next.push({
          key: 'feedbacks',
          icon: '🔧',
          label: 'Feedbacks remontés',
          items: fb.data.map((f) => ({
            id: f.id,
            text: f.description,
            sub: f.chantier?.num,
            path: f.chantier?.id ? `/chantiers/${f.chantier.id}/feedbacks` : '/dashboard',
          })),
        })
      }
      const ass = await supabase
        .from('assistance_messages')
        .select('id, type, texte')
        .eq('lu', false)
      if (!ass.error && ass.data?.length) {
        next.push({
          key: 'assistance',
          icon: '💬',
          label: 'Assistance',
          items: ass.data.map((a) => ({
            id: a.id,
            text: a.texte,
            sub: a.type,
            path: '/assistance',
          })),
        })
      }
      // Signalements en attente (P12) — best-effort si la table existe.
      const sig = await supabase
        .from('signalements')
        .select('id, type, description')
        .eq('statut', 'en_attente')
      if (!sig.error && sig.data?.length) {
        next.push({
          key: 'signalements',
          icon: '🐞',
          label: 'Signalements',
          items: sig.data.map((s) => ({
            id: s.id,
            text: s.description,
            sub: s.type === 'idee' ? 'idée' : 'problème',
            path: '/assistance',
          })),
        })
      }
    }

    setGroups(next)
  }, [uid, role])

  useEffect(() => {
    load()
  }, [load])

  // Mise à jour en direct quand une source change.
  useRealtime('taches', load)
  useRealtime('feedbacks', load, { enabled: role === 'dir' })
  useRealtime('assistance_messages', load, { enabled: role === 'dir' })
  useRealtime('signalements', load, { enabled: role === 'dir' })

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
      <button
        className="notif-btn"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
      >
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

import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import { useAuthStore } from '../store'
import { formatDateTime } from '../lib/format'

// Initiales d'un auteur pour l'avatar.
function initials(auteur) {
  if (!auteur) return '?'
  const p = auteur.prenom?.[0] ?? ''
  const n = auteur.nom?.[0] ?? ''
  return (p + n || '?').toUpperCase()
}

function authorName(auteur) {
  if (!auteur) return 'Inconnu'
  return `${auteur.prenom ?? ''} ${auteur.nom ?? ''}`.trim() || 'Inconnu'
}

export default function FilTab() {
  const { chantier } = useOutletContext()
  const user = useAuthStore((s) => s.user)
  const [messages, setMessages] = useState([])
  const [ouvrages, setOuvrages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [texte, setTexte] = useState('')
  const [tag, setTag] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  const canPost = Boolean(user?.id)

  async function loadMessages() {
    const { data, error: dbError } = await supabase
      .from('fil_messages')
      .select(
        'id, texte, ouvrage_tag, parent_id, date, ' +
          'auteur:utilisateurs!auteur_id(prenom, nom)'
      )
      .eq('chantier_id', chantier.id)
      .order('date', { ascending: true })
    if (dbError) {
      setError(dbError.message)
      setMessages([])
    } else {
      setMessages(data ?? [])
      setError('')
    }
  }

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const [, ov] = await Promise.all([
        loadMessages(),
        supabase
          .from('ouvrages')
          .select('id, nom')
          .eq('chantier_id', chantier.id)
          .order('nom'),
      ])
      if (!active) return
      setOuvrages(ov.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantier.id])

  // Temps réel : nouveaux messages du fil postés par d'autres utilisateurs.
  useRealtime('fil_messages', loadMessages, { filter: `chantier_id=eq.${chantier.id}` })

  async function postMessage() {
    if (!texte.trim() || !canPost) return
    setSending(true)
    const { error: dbError } = await supabase.from('fil_messages').insert({
      chantier_id: chantier.id,
      auteur_id: user.id,
      texte: texte.trim(),
      ouvrage_tag: tag || null,
      parent_id: null,
    })
    setSending(false)
    if (dbError) {
      setError(dbError.message)
      return
    }
    setTexte('')
    setTag('')
    await loadMessages()
  }

  async function postReply(parentId) {
    if (!replyText.trim() || !canPost) return
    setSending(true)
    const { error: dbError } = await supabase.from('fil_messages').insert({
      chantier_id: chantier.id,
      auteur_id: user.id,
      texte: replyText.trim(),
      parent_id: parentId,
    })
    setSending(false)
    if (dbError) {
      setError(dbError.message)
      return
    }
    setReplyText('')
    setReplyTo(null)
    await loadMessages()
  }

  // Construit l'arbre : racines + réponses par parent.
  const roots = messages.filter((m) => !m.parent_id)
  const repliesByParent = messages.reduce((acc, m) => {
    if (m.parent_id) {
      ;(acc[m.parent_id] = acc[m.parent_id] || []).push(m)
    }
    return acc
  }, {})

  return (
    <div className="fil">
      {loading && <p className="muted">Chargement…</p>}
      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
          {error.toLowerCase().includes('parent_id') && (
            <div className="alert-sub">
              Exécute la migration{' '}
              <code>supabase/migrations/0001_fil_messages_parent.sql</code> dans
              Supabase.
            </div>
          )}
        </div>
      )}

      {!loading && !error && roots.length === 0 && (
        <div className="empty">Aucun message</div>
      )}

      <div className="fil-list">
        {roots.map((msg) => {
          const replies = repliesByParent[msg.id] ?? []
          return (
            <div key={msg.id} className="fil-msg">
              <div className="fil-msg-head">
                <div className="fil-avatar">{initials(msg.auteur)}</div>
                <div>
                  <div className="fil-author">{authorName(msg.auteur)}</div>
                  <div className="fil-date">{formatDateTime(msg.date)}</div>
                </div>
              </div>

              <div className="fil-text">{msg.texte}</div>

              {msg.ouvrage_tag && (
                <div className="fil-tag-row">
                  <span className="fil-tag">📋 {msg.ouvrage_tag}</span>
                </div>
              )}

              {replies.length > 0 && (
                <div className="fil-replies">
                  {replies.map((r) => (
                    <div key={r.id} className="fil-reply">
                      <div className="fil-avatar fil-avatar--sm">
                        {initials(r.auteur)}
                      </div>
                      <div>
                        <span className="fil-reply-author">
                          {authorName(r.auteur)}
                        </span>{' '}
                        <span className="fil-reply-text">{r.texte}</span>
                        <div className="fil-date">
                          {formatDateTime(r.date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {replyTo === msg.id ? (
                <div className="fil-reply-box">
                  <textarea
                    className="ni"
                    rows="2"
                    placeholder="Votre réponse…"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <div className="fil-reply-actions">
                    <button
                      className="btn bp bsm"
                      disabled={sending}
                      onClick={() => postReply(msg.id)}
                    >
                      Répondre
                    </button>
                    <button
                      className="btn bg bsm"
                      onClick={() => {
                        setReplyTo(null)
                        setReplyText('')
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                canPost && (
                  <button
                    className="link-btn"
                    onClick={() => {
                      setReplyTo(msg.id)
                      setReplyText('')
                    }}
                  >
                    ↩ Répondre
                  </button>
                )
              )}
            </div>
          )
        })}
      </div>

      <div className="card fil-composer">
        <div className="fil-composer-title">
          Nouveau message{user ? ` — ${user.prenom} ${user.nom}` : ''}
        </div>
        {!canPost && (
          <div className="alert-sub">
            Utilisateur démo sans identifiant en base — publication désactivée.
          </div>
        )}
        <textarea
          rows="3"
          placeholder="Écrivez…"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          disabled={!canPost}
        />
        <div className="fil-composer-actions">
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            disabled={!canPost}
          >
            <option value="">Taguer un ouvrage…</option>
            {ouvrages.map((o) => (
              <option key={o.id} value={o.nom}>
                {o.nom}
              </option>
            ))}
          </select>
          <button
            className="btn bp bsm"
            disabled={!canPost || sending || !texte.trim()}
            onClick={postMessage}
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TYP_ACHAT, TYP_ACHAT_ORDER, resolve } from '../lib/statuts'
import ArticleModal from './ArticleModal'
import ModeleModal from './ModeleModal'

// Prix unitaire € avec décimales (0 à 2), sans arrondi à l'entier.
function formatPrix(value) {
  if (value == null) return '—'
  return (
    Number(value).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }) + ' €'
  )
}

function TypBadge({ slug }) {
  const t = resolve(TYP_ACHAT, slug)
  return <span className={'typbdg ' + (t.cls ?? 'typ-div')}>{t.label}</span>
}

export default function Bibliotheque() {
  const [tab, setTab] = useState('articles')
  const [articles, setArticles] = useState([])
  const [modeles, setModeles] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [typFilt, setTypFilt] = useState('tous')
  const [articleModal, setArticleModal] = useState(null) // { article } | null
  const [modeleModal, setModeleModal] = useState(null) // { modele } | null

  const loadModeles = useCallback(async () => {
    const { data } = await supabase
      .from('ouvrage_modeles')
      .select('id, nom, description, typs')
      .order('nom')
    setModeles(data ?? [])
  }, [])

  async function loadArticles() {
    const { data, error: dbError } = await supabase
      .from('articles')
      .select(
        'id, nom, description, typ, prix, unite, ' +
          'article_fournisseurs(fournisseur:fournisseurs!fournisseur_id(id, nom))'
      )
      .order('nom')
    if (dbError) {
      setError(dbError.message)
      setArticles([])
    } else {
      setArticles(data ?? [])
    }
  }

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const [, , fo] = await Promise.all([
        loadArticles(),
        loadModeles(),
        supabase.from('fournisseurs').select('id, nom').eq('type', 'fournisseur').order('nom'),
      ])
      if (!active) return
      setFournisseurs(fo.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadModeles])

  const filtered = useMemo(
    () =>
      typFilt === 'tous'
        ? articles
        : articles.filter((a) => a.typ === typFilt),
    [articles, typFilt]
  )

  return (
    <section className="page">
      <div className="page-head">
        <h2>Bibliothèques</h2>
      </div>

      <nav className="subtabs">
        <button
          className={'subtab' + (tab === 'articles' ? ' subtab--active' : '')}
          onClick={() => setTab('articles')}
        >
          Articles
        </button>
        <button
          className={'subtab' + (tab === 'modeles' ? ' subtab--active' : '')}
          onClick={() => setTab('modeles')}
        >
          ⭐ Ouvrages modèles
        </button>
      </nav>

      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
          {(error.includes('articles') || error.includes('ouvrage_modeles')) && (
            <div className="alert-sub">
              Exécute la migration{' '}
              <code>supabase/migrations/0003_bibliotheques.sql</code> dans
              Supabase.
            </div>
          )}
        </div>
      )}

      {loading && <p className="muted">Chargement…</p>}

      {!loading && tab === 'articles' && (
        <>
          <div className="page-head">
            <span className="card-title">{articles.length} articles</span>
            <button
              className="btn bp bsm"
              style={{ marginLeft: 'auto' }}
              onClick={() => setArticleModal({ article: null })}
            >
              + Article
            </button>
          </div>

          <div className="course-filters">
            {['tous', ...TYP_ACHAT_ORDER].map((slug) => (
              <button
                key={slug}
                className="btn bg bsm"
                style={
                  typFilt === slug
                    ? { background: 'var(--acier)', color: '#fff', borderColor: 'var(--acier)' }
                    : undefined
                }
                onClick={() => setTypFilt(slug)}
              >
                {slug === 'tous' ? 'Tous' : TYP_ACHAT[slug].label}
              </button>
            ))}
          </div>

          <div className="table-wrap">
            <table className="data-table striped">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Nom</th>
                  <th>Description</th>
                  <th>Prix/Unité</th>
                  <th>Fournisseurs</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const fs = (a.article_fournisseurs ?? [])
                    .map((af) => af.fournisseur?.nom)
                    .filter(Boolean)
                  return (
                    <tr key={a.id} className="row-link" onClick={() => setArticleModal({ article: a })}>
                      <td>{a.typ && <TypBadge slug={a.typ} />}</td>
                      <td className="strong">{a.nom}</td>
                      <td>{a.description ?? '—'}</td>
                      <td className="mono">
                        {formatPrix(a.prix)}
                        {a.unite ? ' / ' + a.unite : ''}
                      </td>
                      <td>{fs.length ? fs.join(', ') : '—'}</td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty">
                      Aucun article
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && tab === 'modeles' && (
        <>
          <div className="page-head">
            <span className="card-title">{modeles.length} modèle(s)</span>
            <button
              className="btn bp bsm"
              style={{ marginLeft: 'auto' }}
              onClick={() => setModeleModal({ modele: null })}
            >
              + Modèle
            </button>
          </div>
          {modeles.length === 0 ? (
            <div className="empty">Aucun modèle</div>
          ) : (
            modeles.map((m) => (
              <div
                key={m.id}
                className="card model-pick"
                onClick={() => setModeleModal({ modele: m })}
              >
                <div className="modele-nom">⭐ {m.nom}</div>
                {m.description && (
                  <div className="modele-desc">{m.description}</div>
                )}
                <div className="modele-typs">
                  {(m.typs ?? []).map((slug) => (
                    <TypBadge key={slug} slug={slug} />
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {articleModal && (
        <ArticleModal
          article={articleModal.article}
          fournisseurs={fournisseurs}
          onClose={() => setArticleModal(null)}
          onSaved={async () => {
            setArticleModal(null)
            await loadArticles()
          }}
        />
      )}
      {modeleModal && (
        <ModeleModal
          modele={modeleModal.modele}
          onClose={() => setModeleModal(null)}
          onSaved={async () => {
            setModeleModal(null)
            await loadModeles()
          }}
        />
      )}
    </section>
  )
}

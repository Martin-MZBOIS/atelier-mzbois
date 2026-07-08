import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store'
import { formatDate, formatEuro } from '../lib/format'
import { TYPE_SOCIETE, resolve } from '../lib/statuts'
import SocieteModal from './SocieteModal'
import ContactPersonModal from './ContactPersonModal'

// Sous-onglets : les 3 premiers filtrent `fournisseurs` par type ;
// « Salariés » (employes) n'est visible que pour dir et prod.
const SOC_TABS = [
  { id: 'fournisseur', label: 'Fournisseurs' },
  { id: 'client', label: 'Clients' },
  { id: 'sous_traitant', label: 'Sous-traitants' },
]

export default function Contacts() {
  const user = useAuthStore((s) => s.user)
  const canSeeSalaries = ['dir', 'prod'].includes(user?.role)

  const [societes, setSocietes] = useState([])
  const [employes, setEmployes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('fournisseur')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [societeModal, setSocieteModal] = useState(null) // { societe } | null
  const [addContactFor, setAddContactFor] = useState(null)

  const loadSocietes = useCallback(async () => {
    const contactsSel = 'contacts:contacts!fournisseur_id(id, nom, role, tel, email)'
    // Tente avec site_web ; repli sans si la colonne n'existe pas encore.
    let { data, error: dbError } = await supabase
      .from('fournisseurs')
      .select(`id, nom, adresse, famille, type, site_web, ${contactsSel}`)
      .order('nom')
    if (dbError && /site_web/.test(dbError.message)) {
      ;({ data, error: dbError } = await supabase
        .from('fournisseurs')
        .select(`id, nom, adresse, famille, type, ${contactsSel}`)
        .order('nom'))
    }
    if (dbError) setError(dbError.message)
    else setSocietes(data ?? [])
  }, [])

  const loadEmployes = useCallback(async () => {
    const { data } = await supabase.from('employes').select('*').order('nom')
    setEmployes(data ?? [])
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      await Promise.all([loadSocietes(), loadEmployes()])
      if (!active) return
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [loadSocietes, loadEmployes])

  const isSalaries = tab === 'salaries'

  // Liste selon l'onglet actif.
  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (isSalaries) {
      return employes
        .map((e) => ({ id: e.id, label: `${e.prenom} ${e.nom}`, sub: e.role, raw: e }))
        .filter((it) => !q || it.label.toLowerCase().includes(q))
    }
    return societes
      .filter((s) => s.type === tab)
      .map((s) => ({ id: s.id, label: s.nom, sub: s.famille, raw: s }))
      .filter((it) => !q || it.label.toLowerCase().includes(q))
  }, [societes, employes, tab, search, isSalaries])

  const selected = list.find((it) => it.id === selectedId) ?? null

  function switchTab(id) {
    setTab(id)
    setSelectedId(null)
    setSearch('')
  }

  return (
    <section className="page">
      <div className="page-head">
        <h2>Contacts</h2>
        {!isSalaries && (
          <button
            className="btn bp bsm"
            style={{ marginLeft: 'auto' }}
            onClick={() => setSocieteModal({ societe: null })}
          >
            + Nouveau
          </button>
        )}
      </div>

      <nav className="subtabs">
        {SOC_TABS.map((t) => (
          <button
            key={t.id}
            className={'subtab' + (tab === t.id ? ' subtab--active' : '')}
            onClick={() => switchTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        {canSeeSalaries && (
          <button
            className={'subtab' + (isSalaries ? ' subtab--active' : '')}
            onClick={() => switchTab('salaries')}
          >
            Salariés
          </button>
        )}
      </nav>

      {error && (
        <div className="alert">
          <strong>Erreur :</strong> {error}
        </div>
      )}
      {loading ? (
        <p className="muted">Chargement…</p>
      ) : (
        <div className="contacts-layout">
          {/* Liste */}
          <div className="contacts-list">
            <input
              className="plan-search"
              style={{ width: '100%', marginBottom: 8 }}
              placeholder="🔍 Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {list.length === 0 ? (
              <div className="empty">Aucun élément</div>
            ) : (
              list.map((it) => (
                <div
                  key={it.id}
                  className={
                    'contact-item' + (selectedId === it.id ? ' contact-item--on' : '')
                  }
                  onClick={() => setSelectedId(it.id)}
                >
                  <div className="contact-item-name">{it.label}</div>
                  {it.sub && <div className="contact-item-sub">{it.sub}</div>}
                </div>
              ))
            )}
          </div>

          {/* Détail */}
          <div className="contacts-detail">
            {!selected ? (
              <div className="empty contacts-empty">
                Sélectionne un élément pour voir sa fiche.
              </div>
            ) : isSalaries ? (
              <EmployeDetail e={selected.raw} onUpdated={loadEmployes} />
            ) : (
              <SocieteDetail
                s={selected.raw}
                onEdit={() => setSocieteModal({ societe: selected.raw })}
                onAddContact={() => setAddContactFor(selected.id)}
              />
            )}
          </div>
        </div>
      )}

      {societeModal && (
        <SocieteModal
          societe={societeModal.societe}
          defaultType={tab}
          onClose={() => setSocieteModal(null)}
          onSaved={async (newId) => {
            setSocieteModal(null)
            await loadSocietes()
            setSelectedId(newId)
          }}
        />
      )}
      {addContactFor && (
        <ContactPersonModal
          fournisseurId={addContactFor}
          onClose={() => setAddContactFor(null)}
          onSaved={async () => {
            setAddContactFor(null)
            await loadSocietes()
          }}
        />
      )}
    </section>
  )
}

function SocieteDetail({ s, onEdit, onAddContact }) {
  const t = resolve(TYPE_SOCIETE, s.type)
  const contacts = s.contacts ?? []
  return (
    <div className="detail-panel">
      <div className="detail-panel-head">
        <h3>{s.nom}</h3>
        <span
          className="aspill"
          style={{ color: t.color, backgroundColor: t.color + '22' }}
        >
          {t.label}
        </span>
        <button className="btn bg bxs" style={{ marginLeft: 'auto' }} onClick={onEdit}>
          ✏ Modifier
        </button>
      </div>
      <dl className="detail-fields">
        {s.adresse && (
          <div>
            <dt>Adresse</dt>
            <dd>{s.adresse}</dd>
          </div>
        )}
        {s.famille && (
          <div>
            <dt>Famille</dt>
            <dd>{s.famille}</dd>
          </div>
        )}
        {s.site_web && (
          <div>
            <dt>Site web</dt>
            <dd>
              <a
                className="site-link"
                href={/^https?:\/\//.test(s.site_web) ? s.site_web : 'https://' + s.site_web}
                target="_blank"
                rel="noopener noreferrer"
              >
                🔗 {s.site_web.replace(/^https?:\/\//, '')}
              </a>
            </dd>
          </div>
        )}
      </dl>

      <div className="detail-contacts-head">
        <div className="sl">Contacts</div>
        <button className="btn bg bxs" onClick={onAddContact}>
          + Nouveau contact
        </button>
      </div>
      {contacts.length === 0 ? (
        <div className="empty">Aucun contact</div>
      ) : (
        contacts.map((c) => (
          <div key={c.id} className="contact-card">
            <div className="contact-card-top">
              <span className="contact-card-name">{c.nom}</span>
              {c.role && <span className="contact-card-role">{c.role}</span>}
            </div>
            <div className="contact-card-meta">
              {c.tel && <span>📞 {c.tel}</span>}
              {c.email && <span>✉️ {c.email}</span>}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function EmployeDetail({ e, onUpdated }) {
  const couleur = e.couleur || '#846a57'
  const initials = ((e.prenom?.[0] ?? '') + (e.nom?.[0] ?? '')).toUpperCase()
  const [colorError, setColorError] = useState('')

  async function changeColor(value) {
    const { error: dbError } = await supabase
      .from('employes')
      .update({ couleur: value })
      .eq('id', e.id)
    if (dbError) {
      setColorError(dbError.message)
      return
    }
    setColorError('')
    onUpdated?.()
  }

  return (
    <div className="detail-panel">
      <div className="detail-panel-head">
        <span className="emp-avatar" style={{ background: couleur }}>
          {initials}
        </span>
        <h3>
          {e.prenom} {e.nom}
        </h3>
        {e.role && <span className="typbdg typ-div">{e.role}</span>}
      </div>

      <div className="emp-color">
        <label>Couleur</label>
        <input
          type="color"
          value={couleur}
          onChange={(evt) => changeColor(evt.target.value)}
        />
        <span className="emp-color-hex">{couleur}</span>
      </div>
      {colorError && (
        <div className="alert">
          {colorError.includes('couleur') ? (
            <>
              Exécute la migration{' '}
              <code>supabase/migrations/0009_employe_couleur.sql</code>.
            </>
          ) : (
            colorError
          )}
        </div>
      )}
      <dl className="detail-fields">
        {e.poste && (
          <div>
            <dt>Poste</dt>
            <dd>{e.poste}</dd>
          </div>
        )}
        {e.contrat && (
          <div>
            <dt>Contrat</dt>
            <dd>{e.contrat}</dd>
          </div>
        )}
        {e.date_entree && (
          <div>
            <dt>Entrée</dt>
            <dd>{formatDate(e.date_entree)}</dd>
          </div>
        )}
        {e.tel && (
          <div>
            <dt>Téléphone</dt>
            <dd>{e.tel}</dd>
          </div>
        )}
        {e.email && (
          <div>
            <dt>Email</dt>
            <dd>{e.email}</dd>
          </div>
        )}
        {e.cout_h != null && (
          <div>
            <dt>Coût horaire</dt>
            <dd>{formatEuro(e.cout_h)}/h</dd>
          </div>
        )}
        {e.note && (
          <div>
            <dt>Note</dt>
            <dd>{e.note}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}

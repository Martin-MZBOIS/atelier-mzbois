import { useCallback, useEffect, useMemo, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { SkelList } from '../components/Skeleton'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store'
import { useSettings } from '../store/settings'
import { formatDate, formatEuro, calcAnciennete } from '../lib/format'
import { TYPE_SOCIETE, resolve } from '../lib/statuts'
import SocieteModal from './SocieteModal'
import ContactPersonModal from './ContactPersonModal'
import SalarieModal from './SalarieModal'
import AddressLink from '../components/AddressLink'

// Sous-onglets : les 3 premiers filtrent `fournisseurs` par type ;
// « Salariés » (employes) n'est visible que pour dir et prod.
const SOC_TABS = [
  { id: 'fournisseur', label: 'Fournisseurs' },
  { id: 'client', label: 'Clients' },
  { id: 'sous_traitant', label: 'Sous-traitants' },
]

// Palette stable pour les badges de spécialité (par position dans la liste).
const SPEC_COLORS = ['#846a57', '#4a6b8a', '#5a7a5a', '#8a7040', '#6b5a8a', '#8b3a3a', '#3d7a7a']
export function specColor(specialitesOptions, sp) {
  const i = specialitesOptions.indexOf(sp)
  return SPEC_COLORS[(i < 0 ? 0 : i) % SPEC_COLORS.length]
}

export default function Contacts() {
  const user = useAuthStore((s) => s.user)
  const canSeeSalaries = ['dir', 'prod'].includes(user?.role)
  const specialitesOptions = useSettings((s) => s.specialites) ?? []

  const [societes, setSocietes] = useState([])
  const [employes, setEmployes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('fournisseur')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [societeModal, setSocieteModal] = useState(null) // { societe } | null
  const [addContactFor, setAddContactFor] = useState(null)
  const [salarieModal, setSalarieModal] = useState(null) // {} (nouveau) | { employe } | null
  const [specFilter, setSpecFilter] = useState(null) // filtre spécialité (sous-traitants)

  const loadSocietes = useCallback(async () => {
    const contactsSel = 'contacts:contacts!fournisseur_id(id, nom, role, tel, email)'
    const specSel = 'specialites:soustraitant_specialites(specialite)'
    // Repli progressif si specialites (0023), adresse_livraison (0015)
    // ou site_web (0010) n'existent pas encore.
    let { data, error: dbError } = await supabase
      .from('fournisseurs')
      .select(`id, nom, adresse, adresse_livraison, famille, type, site_web, ${contactsSel}, ${specSel}`)
      .order('nom')
    if (dbError && /soustraitant_specialites|specialite/.test(dbError.message)) {
      ;({ data, error: dbError } = await supabase
        .from('fournisseurs')
        .select(`id, nom, adresse, adresse_livraison, famille, type, site_web, ${contactsSel}`)
        .order('nom'))
    }
    if (dbError && /adresse_livraison/.test(dbError.message)) {
      ;({ data, error: dbError } = await supabase
        .from('fournisseurs')
        .select(`id, nom, adresse, famille, type, site_web, ${contactsSel}`)
        .order('nom'))
    }
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

  // Spécialités d'un sous-traitant sous forme de tableau de chaînes.
  const specNames = (s) => (s?.specialites ?? []).map((x) => x.specialite)

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
      .filter((s) => tab !== 'sous_traitant' || !specFilter || specNames(s).includes(specFilter))
      .map((s) => ({ id: s.id, label: s.nom, sub: s.famille, raw: s }))
      .filter((it) => !q || it.label.toLowerCase().includes(q))
  }, [societes, employes, tab, search, isSalaries, specFilter])

  const selected = list.find((it) => it.id === selectedId) ?? null

  function switchTab(id) {
    setTab(id)
    setSpecFilter(null)
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
        {isSalaries && (
          <button
            className="btn bp bsm"
            style={{ marginLeft: 'auto' }}
            onClick={() => setSalarieModal({})}
          >
            + Nouveau salarié
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
        <SkelList rows={8} />
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
            {tab === 'sous_traitant' && specialitesOptions.length > 0 && (
              <div className="spec-filter">
                <button
                  className={'spec-chip spec-chip--sm' + (!specFilter ? ' spec-chip--on' : '')}
                  onClick={() => setSpecFilter(null)}
                >
                  Toutes
                </button>
                {specialitesOptions.map((sp) => (
                  <button
                    key={sp}
                    className={'spec-chip spec-chip--sm' + (specFilter === sp ? ' spec-chip--on' : '')}
                    onClick={() => setSpecFilter(specFilter === sp ? null : sp)}
                  >
                    {sp}
                  </button>
                ))}
              </div>
            )}
            {list.length === 0 ? (
              <EmptyState
                ico="📇"
                titre="Aucun élément"
                aide="Affinez votre recherche, ou ajoutez une fiche avec le bouton ci-dessus."
              />
            ) : (
              list.map((it) => {
                const specs = tab === 'sous_traitant' ? specNames(it.raw) : []
                return (
                  <div
                    key={it.id}
                    className={
                      'contact-item' + (selectedId === it.id ? ' contact-item--on' : '')
                    }
                    onClick={() => setSelectedId(it.id)}
                  >
                    <div className="contact-item-name">{it.label}</div>
                    {it.sub && <div className="contact-item-sub">{it.sub}</div>}
                    {specs.length > 0 && (
                      <div className="spec-badges">
                        {specs.map((sp) => (
                          <span
                            key={sp}
                            className="spec-badge"
                            style={{ color: specColor(specialitesOptions, sp), borderColor: specColor(specialitesOptions, sp) }}
                          >
                            {sp}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Détail */}
          <div className="contacts-detail">
            {!selected ? (
              <EmptyState
                className="contacts-empty"
                ico="👈"
                titre="Aucune fiche ouverte"
                aide="Choisissez un élément dans la liste pour afficher sa fiche."
              />
            ) : isSalaries ? (
              <EmployeDetail
                e={selected.raw}
                onUpdated={loadEmployes}
                onEdit={() => setSalarieModal({ employe: selected.raw })}
              />
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
      {salarieModal && (
        <SalarieModal
          employe={salarieModal.employe}
          onClose={() => setSalarieModal(null)}
          onSaved={async (newId) => {
            setSalarieModal(null)
            await loadEmployes()
            setSelectedId(newId)
          }}
        />
      )}
    </section>
  )
}

function SocieteDetail({ s, onEdit, onAddContact }) {
  const t = resolve(TYPE_SOCIETE, s.type)
  const contacts = s.contacts ?? []
  const specialitesOptions = useSettings((st) => st.specialites) ?? []
  const specs = (s.specialites ?? []).map((x) => x.specialite)
  return (
    <div className="detail-panel">
      <div className="detail-panel-head">
        <h3 className="detail-name--click" onClick={onEdit} title="Modifier la fiche">
          {s.nom}
        </h3>
        <span
          className="aspill"
          style={{ color: t.color, backgroundColor: t.color + '22' }}
        >
          {t.label}
        </span>
      </div>
      {specs.length > 0 && (
        <div className="spec-badges" style={{ marginBottom: 10 }}>
          {specs.map((sp) => (
            <span
              key={sp}
              className="spec-badge"
              style={{ color: specColor(specialitesOptions, sp), borderColor: specColor(specialitesOptions, sp) }}
            >
              {sp}
            </span>
          ))}
        </div>
      )}
      <dl className="detail-fields">
        {s.adresse && (
          <div>
            <dt>Siège social</dt>
            <dd><AddressLink address={s.adresse} /></dd>
          </div>
        )}
        {s.adresse_livraison && (
          <div>
            <dt>Livraison</dt>
            <dd><AddressLink address={s.adresse_livraison} /></dd>
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
        <EmptyState
          ico="👤"
          titre="Aucun contact"
          aide="Ajoutez les interlocuteurs de cette fiche pour les retrouver depuis un chantier."
        />
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

function EmployeDetail({ e, onUpdated, onEdit }) {
  const couleur = e.couleur || '#846a57'
  const initials = ((e.prenom?.[0] ?? '') + (e.nom?.[0] ?? '')).toUpperCase()
  const [colorError, setColorError] = useState('')
  const anciennete = calcAnciennete(e.date_entree)

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
        <h3 className="detail-name--click" onClick={onEdit} title="Modifier le salarié">
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
            <dd>
              {formatDate(e.date_entree)}
              {anciennete && <span className="emp-anc"> · {anciennete}</span>}
            </dd>
          </div>
        )}
        {e.date_naissance && (
          <div>
            <dt>Naissance</dt>
            <dd>{formatDate(e.date_naissance)}</dd>
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

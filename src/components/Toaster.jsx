import { useToasts } from '../store/toasts'

// Affiche les messages de retour en bas à droite.
// `aria-live="polite"` : les lecteurs d'écran annoncent le message sans
// interrompre ce que fait l'utilisateur.
export default function Toaster() {
  const items = useToasts((s) => s.items)
  const remove = useToasts((s) => s.remove)

  if (items.length === 0) return null

  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <button
          key={t.id}
          className={'toast toast--' + t.ton}
          onClick={() => remove(t.id)}
          title="Masquer"
        >
          <span className="toast-ico">
            {t.ton === 'error' ? '⚠' : t.ton === 'info' ? 'ℹ' : '✓'}
          </span>
          <span className="toast-txt">{t.texte}</span>
        </button>
      ))}
    </div>
  )
}

// Raccourcis clavier des fenêtres de saisie.
//
// Entrée valide, Échap ferme : deux conventions que tout le monde attend d'un
// formulaire. Sans elles, il faut lâcher le clavier et viser un bouton à la
// souris pour chaque saisie.
//
// À poser sur le conteneur `.modal-box` :
//   <div className="modal-box" onKeyDown={raccourcisModal(handleSave, onClose, saving)}>
export function raccourcisModal(onValider, onFermer, occupe = false) {
  return (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onFermer?.()
      return
    }
    if (e.key !== 'Enter') return

    // Un textarea a besoin d'Entrée pour aller à la ligne ; Ctrl/Cmd+Entrée y
    // valide quand même, c'est l'usage courant.
    const cible = e.target
    const dansTextarea = cible.tagName === 'TEXTAREA'
    if (dansTextarea && !(e.ctrlKey || e.metaKey)) return

    // Sur un bouton ou un lien, Entrée déclenche déjà l'élément lui-même.
    if (cible.tagName === 'BUTTON' || cible.tagName === 'A') return

    // Un menu déroulant ouvert utilise Entrée pour choisir une option.
    if (e.altKey || e.shiftKey) return

    e.preventDefault()
    if (!occupe) onValider?.()
  }
}

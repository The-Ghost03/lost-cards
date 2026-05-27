/**
 * Partage une annonce via l'API Web Share native (sheet OS sur mobile)
 * avec fallback WhatsApp si l'API n'est pas dispo.
 */
export async function sharePost(post) {
  const url = `${window.location.origin}/posts/${post.id}`
  const name = post.name_partial || post.name_on_cards || 'portefeuille'
  const location = post.location || 'Abidjan'

  const title = 'Portefeuille trouvé — LostCards'
  const text  = `Portefeuille trouvé pour ${name} à ${location}. Vérifie sur LostCards si ça correspond à toi ou à un proche.`

  // 1) Native Web Share API (Android, iOS, desktop avec support)
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (err) {
      // L'utilisateur a annulé la sheet → on ne fait rien
      if (err?.name === 'AbortError') return 'cancelled'
      // Erreur réelle → on tombe sur le fallback
    }
  }

  // 2) Fallback : ouvrir WhatsApp avec le texte pré-rempli
  const encoded = encodeURIComponent(`${text}\n${url}`)
  window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer')
  return 'whatsapp'
}

/**
 * Copie l'URL dans le presse-papier (utilitaire bonus).
 */
export async function copyPostUrl(post) {
  const url = `${window.location.origin}/posts/${post.id}`
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    return false
  }
}

/**
 * Dérive une référence de fiche courte et lisible à partir de l'UUID d'un post.
 * Purement dérivé côté client (aucun appel backend) : on prend les 8 premiers
 * caractères hexadécimaux de l'UUID (tirets retirés), formatés en deux
 * groupes de 4 séparés par un tiret, en majuscules.
 *
 * @example ficheRef('5fc5769a-065e-4a1e-9c3b-...') // → '5FC5-769A'
 */
export function ficheRef(id) {
  if (!id) return ''
  const hex = String(id).replace(/-/g, '').slice(0, 8).toUpperCase()
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`
}

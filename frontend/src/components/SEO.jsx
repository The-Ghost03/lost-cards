import { Helmet } from 'react-helmet-async'

const SITE = 'https://lost-card.softskills.ci'
const DEFAULT_IMG = `${SITE}/og-image.png`

/**
 * Composant SEO réutilisable — injecte title, meta description, OpenGraph, Twitter.
 *
 * @param {string} title - titre de l'onglet (suffixé par " — LostCards")
 * @param {string} description - meta description (max ~160 chars)
 * @param {string} path - chemin canonical (ex. "/posts/123")
 * @param {string} image - URL absolue de l'image OG (optionnel)
 * @param {boolean} noindex - true pour exclure de l'indexation
 */
export default function SEO({ title, description, path = '/', image, noindex = false }) {
  const fullTitle = title ? `${title} — LostCards` : 'LostCards — Retrouvez vos pièces perdues à Abidjan'
  const canonical = `${SITE}${path}`
  const img       = image || DEFAULT_IMG
  const desc      = description || 'Plateforme sécurisée pour récupérer un portefeuille perdu à Abidjan. CNI, permis, carte bancaire — vérification par selfie, 100% gratuit.'

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, follow" />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={img} />

      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  )
}

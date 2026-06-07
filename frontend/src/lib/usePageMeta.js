import { useEffect } from 'react'

const BASE = 'LostCards Abidjan'
const BASE_URL = 'https://lost-card.softskills.ci'
const DEFAULT_IMG = `${BASE_URL}/og-image.png`

/**
 * Met à jour dynamiquement le <title> et les meta tags SEO/OG.
 * @param {object} opts
 * @param {string}  opts.title       — titre de la page (sans le suffixe)
 * @param {string}  [opts.description]
 * @param {string}  [opts.url]       — URL canonique (défaut: window.location.href)
 * @param {string}  [opts.image]     — URL de l'image OG
 * @param {object}  [opts.jsonLd]    — objet JSON-LD schema.org
 */
export function usePageMeta({ title, description, url, image, jsonLd } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${BASE}` : `${BASE} — Retrouvez vos pièces perdues`
    const desc = description ?? 'Plateforme citoyenne pour retrouver les portefeuilles et pièces perdus à Abidjan, Côte d\'Ivoire.'
    const canonicalUrl = url ?? (typeof window !== 'undefined' ? window.location.href : BASE_URL)
    const img = image ?? DEFAULT_IMG

    document.title = fullTitle

    setMeta('name', 'description', desc)
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:url', canonicalUrl)
    setMeta('property', 'og:image', img)
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', desc)
    setMeta('name', 'twitter:image', img)

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl

    // JSON-LD
    const id = 'jsonld-dynamic'
    let script = document.getElementById(id)
    if (jsonLd) {
      if (!script) {
        script = document.createElement('script')
        script.id = id
        script.type = 'application/ld+json'
        document.head.appendChild(script)
      }
      script.textContent = JSON.stringify(jsonLd)
    } else if (script) {
      script.remove()
    }

    return () => {
      // Restore defaults on unmount
      document.title = `${BASE} — Retrouvez vos pièces perdues à Abidjan`
    }
  }, [title, description, url, image, jsonLd])
}

function setMeta(attr, name, content) {
  let el = document.querySelector(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

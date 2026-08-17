import { Link } from 'react-router-dom'
import { MapPin, Calendar, FileText, CheckCircle, ArrowRight, Share2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { sharePost } from '../lib/share'
import { ficheRef } from '../lib/ficheRef'

// Les types de documents ne portent aucune information par leur couleur —
// une seule teinte neutre pour tous les badges (direction « Fiche »).
const DOC_LABELS = {
  cni:        'CNI',
  permis:     'Permis',
  bancaire:   'Carte bancaire',
  assurance:  'Assurance',
  passeport:  'Passeport',
  sejour:     'Carte de séjour',
  electeur:   "Carte d'électeur",
  autre:      'Autre',
}

const DAY_MS = 24 * 60 * 60 * 1000

export default function PostCard({ post }) {
  const createdAt = new Date(post.created_at)
  const age = formatDistanceToNow(createdAt, { addSuffix: true, locale: fr })
  // Indicateur de fraîcheur purement visuel : une lecture non déterministe de
  // l'horloge ici n'a aucun impact fonctionnel (pas d'état, pas de boucle de
  // rendu) si le composant est re-rendu plus tard avec une valeur différente.
  // eslint-disable-next-line react-hooks/purity
  const isFresh = Date.now() - createdAt.getTime() < DAY_MS

  return (
    <Link
      to={`/posts/${post.id}`}
      className={`card-hover block group ${
        isFresh ? 'border-y border-r border-ink-200 border-l-2 border-l-flame-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink-950 text-base group-hover:text-flame-700 transition-colors">{post.name_partial}</p>
          <p className="font-mono text-ref text-ink-400 uppercase tracking-[0.06em]">FICHE {ficheRef(post.id)}</p>
          <p className="text-meta text-ink-400 flex items-center gap-1 mt-0.5">
            <MapPin size={11} /> {post.location}
          </p>
        </div>
        {post.status === 'recovered'
          ? <span className="badge bg-signal-50 text-signal-600 shrink-0">
              <CheckCircle size={11} /> Récupéré
            </span>
          : <ArrowRight size={16} className="text-ink-200 group-hover:text-flame-500 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
        }
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {post.documents.map(doc => (
          <span key={doc} className="badge bg-ink-100 text-ink-600">
            <FileText size={10} /> {DOC_LABELS[doc] || DOC_LABELS.autre}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-meta text-ink-400 flex items-center gap-1">
          <Calendar size={11} /> Trouvé {age}
        </p>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); sharePost(post) }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-control bg-flame-50 dark:bg-orange-950/40 text-flame-700 dark:text-orange-400 hover:bg-flame-50/70 dark:hover:bg-orange-900/50 transition-colors active:scale-95 transition-transform duration-100 text-meta font-semibold"
          aria-label="Partager cette annonce"
        >
          <Share2 size={12} />
          <span>Partager</span>
        </button>
      </div>
    </Link>
  )
}

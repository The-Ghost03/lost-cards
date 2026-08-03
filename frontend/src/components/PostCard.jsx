import { Link } from 'react-router-dom'
import { MapPin, Calendar, FileText, CheckCircle, ArrowRight, Share2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { sharePost } from '../lib/share'

const DOC_LABELS = {
  cni:        { label: 'CNI',            color: 'bg-blue-100 text-blue-700' },
  permis:     { label: 'Permis',         color: 'bg-green-100 text-green-700' },
  bancaire:   { label: 'Carte bancaire', color: 'bg-purple-100 text-purple-700' },
  assurance:  { label: 'Assurance',      color: 'bg-yellow-100 text-yellow-700' },
  passeport:  { label: 'Passeport',      color: 'bg-red-100 text-red-700' },
  sejour:     { label: 'Carte de séjour',color: 'bg-indigo-100 text-indigo-700' },
  electeur:   { label: "Carte d'électeur", color: 'bg-pink-100 text-pink-700' },
  autre:      { label: 'Autre',          color: 'bg-gray-100 text-gray-600' },
}

export default function PostCard({ post }) {
  const age = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })

  return (
    <Link to={`/posts/${post.id}`} className="card-hover block group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink-950 text-base group-hover:text-flame-700 transition-colors">{post.name_partial}</p>
          <p className="text-meta text-ink-400 flex items-center gap-1 mt-0.5">
            <MapPin size={11} /> {post.location}
          </p>
        </div>
        {post.status === 'recovered'
          ? <span className="badge bg-green-100 text-green-700 shrink-0">
              <CheckCircle size={11} /> Récupéré
            </span>
          : <ArrowRight size={16} className="text-ink-200 group-hover:text-flame-500 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
        }
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {post.documents.map(doc => {
          const meta = DOC_LABELS[doc] || DOC_LABELS.autre
          return (
            <span key={doc} className={`badge ${meta.color}`}>
              <FileText size={10} /> {meta.label}
            </span>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-meta text-ink-400 flex items-center gap-1">
          <Calendar size={11} /> Trouvé {age}
        </p>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); sharePost(post) }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-control bg-flame-50 dark:bg-orange-950/40 text-flame-700 dark:text-orange-400 hover:bg-flame-50/70 dark:hover:bg-orange-900/50 transition-colors text-meta font-semibold"
          aria-label="Partager cette annonce"
        >
          <Share2 size={12} />
          <span>Partager</span>
        </button>
      </div>
    </Link>
  )
}

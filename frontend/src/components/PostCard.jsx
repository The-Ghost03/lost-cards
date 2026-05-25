import { Link } from 'react-router-dom'
import { MapPin, Calendar, FileText, CheckCircle, ArrowRight, Camera, Clock, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

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

const MY_REQ_BADGE = {
  pending:  { icon: Clock,       label: 'Selfie envoyé · En attente', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  approved: { icon: CheckCircle, label: 'Approuvé · Chat ouvert',     cls: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { icon: XCircle,     label: 'Refusé — réessayez',          cls: 'bg-red-100 text-red-600 border-red-200' },
}

export default function PostCard({ post }) {
  const age = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })
  const my  = post.my_request
  const myBadge = my && MY_REQ_BADGE[my.status]

  return (
    <Link
      to={`/posts/${post.id}`}
      className={`card-hover block group ${my ? 'border-l-4 border-orange-400' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 text-base group-hover:text-orange-600 transition-colors">
            {post.name_partial}
          </p>
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <MapPin size={11} /> {post.location}
          </p>
        </div>
        {post.status === 'recovered'
          ? <span className="badge bg-green-100 text-green-700 shrink-0">
              <CheckCircle size={11} /> Récupéré
            </span>
          : <ArrowRight size={16} className="text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
        }
      </div>

      {/* Badge "ma demande" si l'utilisateur a déjà interagi */}
      {myBadge && (
        <div className={`mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${myBadge.cls}`}>
          <myBadge.icon size={12} />
          {myBadge.label}
        </div>
      )}

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

      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Calendar size={11} /> Trouvé {age}
      </p>
    </Link>
  )
}

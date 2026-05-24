import { Link } from 'react-router-dom'
import { MapPin, Calendar, FileText, CheckCircle } from 'lucide-react'
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

export default function PostCard({ post }) {
  const age = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })

  return (
    <Link to={`/posts/${post.id}`} className="card block hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-semibold text-gray-800 text-base">{post.name_partial}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <MapPin size={11} /> {post.location}
          </p>
        </div>
        {post.status === 'recovered' && (
          <span className="badge bg-green-100 text-green-700 shrink-0">
            <CheckCircle size={11} /> Récupéré
          </span>
        )}
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

      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Calendar size={11} /> Trouvé {age}
      </p>
    </Link>
  )
}

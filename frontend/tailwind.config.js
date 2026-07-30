import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neutres chauds — direction « Fiche ». La palette `gray` par défaut
        // de Tailwind reste disponible (migration progressive, cf. P1/P2).
        ink: {
          950: '#141210', // titres, texte principal      · 17,0:1 sur paper
          600: '#4A423B', // corps secondaire             ·  9,2:1
          400: '#6E655D', // méta, horodatages            ·  5,4:1  ← remplace gray-400 (2,85:1)
          200: '#E7E2DB', // filets, bordures 1px
          100: '#F0ECE6', // remplissages discrets
        },
        paper:   '#FAF8F5', // fond de page   ← remplace bg-gray-50
        surface: '#FFFFFF',

        // Action — l'orange, encré
        flame: {
          50:  '#FDF0E4',
          500: '#E85D04', // marque, icônes, remplissages larges (3,30:1 ≥ 3:1 UI)
          700: '#B4400A', // fonds de bouton + texte blanc (5,71:1) ET texte orange sur paper (5,24:1)
          300: '#FF9A5C', // dark mode uniquement
        },

        // Statuts — 3 couleurs sémantiques (remplacent les 8 badges pastel, P1)
        signal:  { 50: '#E4F2EA', 600: '#0B7A4B' }, // validé
        pending: { 50: '#FBF1D6', 700: '#8A5A00' }, // en attente
        alert:   { 50: '#FBE9E7', 700: '#B42318' }, // refusé / erreur

        // Dark mode — noir chaud, pas slate
        night: { 950: '#12100E', 900: '#1B1815', 700: '#2A2521' },
      },
      fontFamily: {
        sans: ['Public Sans Variable', ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        // Échelle « Fiche » — plancher 13px, hiérarchie par taille/poids.
        'display': ['1.875rem',  { lineHeight: '2.125rem',  letterSpacing: '-0.02em',  fontWeight: '700' }],
        'h1':      ['1.5rem',    { lineHeight: '1.8125rem', letterSpacing: '-0.015em', fontWeight: '700' }],
        'h2':      ['1.1875rem', { lineHeight: '1.5rem',    letterSpacing: '-0.01em',  fontWeight: '650' }],
        'lead':    ['1.0625rem', { lineHeight: '1.625rem' }],
        'body':    ['0.9375rem', { lineHeight: '1.4375rem' }],
        'label':   ['0.8125rem', { lineHeight: '1.125rem',  letterSpacing: '0.005em',  fontWeight: '600' }],
        'meta':    ['0.8125rem', { lineHeight: '1.125rem',  fontWeight: '500' }], // ← remplace text-xs (109×)
        'ref':     ['0.8125rem', { lineHeight: '1rem',      letterSpacing: '0.06em',   fontWeight: '500' }],
      },
      borderRadius: {
        fiche:   '12px',   // cartes, images, modales — dérivé de l'objet réel
        control: '10px',   // boutons, champs, chips
        stamp:   '9999px', // pastilles de statut, avatars UNIQUEMENT
      },
      boxShadow: {
        // Réservé aux éléments flottants (modales, sheet, toast, bottom bar).
        // Filets partout ailleurs — voir .card dans index.css.
        float: 'var(--shadow-float)',
      },
    },
  },
  plugins: [],
}

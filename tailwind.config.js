/**
 * Configuration Tailwind — migrée depuis le bloc inline d'index.html.
 *
 * Le projet chargeait `https://cdn.tailwindcss.com`, le CDN de développement,
 * qui génère les classes DANS le navigateur à chaque visite. Mesuré le
 * 2026-08-27 en bloquant ce script : le corps de page passe de 412 px de large
 * à 1672 px, la hauteur de 995 px à 3370 px, les champs redeviennent blancs et
 * le cadre doré perd fond et bordure. Autrement dit, un opérateur qui filtre,
 * un bloqueur de publicité ou une coupure de 4G au mauvais moment suffisait à
 * détruire toute la mise en page — c'est ce que voyait le patron sur son
 * téléphone alors que la même URL s'affichait correctement ailleurs.
 *
 * Compilé au build, le CSS part dans le bundle servi par Vercel : plus aucune
 * dépendance externe au moment de l'affichage.
 *
 * ⚠️ `content` doit couvrir TOUT fichier produisant des classes. Une classe
 * construite dynamiquement (`bg-${couleur}-500`) ne serait pas vue par le
 * balayage et disparaîtrait du CSS — c'est le principal risque de régression
 * de cette migration.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
    './constants/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        xeption: {
          gold: '#FFD700',      /* Gold vibrant */
          goldDim: '#B8860B',   /* Gold sombre */
          red: '#FF0033',       /* Rouge néon plus vif */
          black: '#050505',     /* Noir profond */
          dark: '#0F0F0F',      /* Gris très sombre */
          surface: '#18181B',   /* Surface carte */
          highlight: '#27272A',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        tech: ['Rajdhani', 'sans-serif'],
        pinyon: ['Pinyon Script', 'cursive'], /* Police Signature */
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'tech-grid':
          'linear-gradient(to right, #1f1f1f 1px, transparent 1px), linear-gradient(to bottom, #1f1f1f 1px, transparent 1px)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
};

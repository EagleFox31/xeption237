/**
 * Xeption Admin ERP — tokens UI (ui-ux-pro-max : Data-Dense Dashboard + Soft UI, React/Tailwind).
 * Source visuelle unique pour tout le staff portal.
 */

export const adminUi = {
  page: 'min-h-screen text-white selection:bg-xeption-gold selection:text-black',

  // Hauteur d'un onglet dont le panneau occupe l'ecran (tableau a defilement
  // interne). Le decor autour n'a PAS la meme hauteur selon la largeur, d'ou
  // trois valeurs — mesurees classe par classe, pas estimees :
  //
  //   < 640 px   barre haute 77 (pt-4 16 + logo 48 + pb-3 12 + bord 1)
  //              + pt-2 8 + bandeau 0 (masque) + pb-28 112       = 197
  //   640-767    barre haute 77 + pt-2 8 + bandeau 54 + mb-3 12
  //              + pb-28 112                                     = 263
  //   >= 768 px  pt-3 12 + bandeau 58 + mb-4 16 + pb-10 40       = 126 (140 tenu)
  //
  // `dvh` sous 768 px et non `vh` : au telephone `vh` vaut la hauteur barre
  // d'adresse MASQUEE, donc surestime ce qui est reellement visible.
  tabViewportH:
    'h-[calc(100dvh-200px)] sm:h-[calc(100dvh-264px)] md:h-[calc(100vh-140px)]',
  // Variante des onglets dont le bandeau porte un bouton d'action : au telephone
  // ce bouton subsiste (36 px + 12 de marge) la ou le bandeau disparait.
  tabViewportHWithActions:
    'h-[calc(100dvh-248px)] sm:h-[calc(100dvh-264px)] md:h-[calc(100vh-140px)]',
  main: 'md:ml-64 min-h-screen relative z-10',
  content: 'max-w-[1600px] mx-auto px-4 md:px-8 pb-28 md:pb-10 pt-2 md:pt-3',
  surface:
    'bg-black/25 backdrop-blur-md border border-white/10 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.15)]',
  surfaceHover: 'hover:border-white/20 transition-colors duration-200',
  card: 'bg-black/25 backdrop-blur-md border border-white/10 rounded-lg p-5 md:p-6',
  // La carte doree n'existe qu'a partir de 640 px. Au telephone elle ne portait
  // plus qu'un titre deja lu dans la barre de navigation, et volait de la
  // hauteur a la page. Le conteneur reste (il abrite les actions), son decor
  // part. Seul AdminPageHeader consomme ce jeton.
  pageHeaderCard:
    'relative overflow-hidden rounded-lg sm:bg-xeption-gold sm:border sm:border-black/15 sm:px-4 sm:py-2 md:px-5 md:py-2.5 sm:shadow-[0_4px_28px_rgba(255,215,0,0.28)]',
  pageHeaderTitle: 'text-black font-tech font-bold uppercase tracking-tight',
  pageHeaderDesc: 'text-sm text-black/75',
  btnOnGold:
    'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-black text-xeption-gold text-xs font-bold uppercase tracking-wider hover:bg-black/85 hover:text-white transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 shadow-sm',
  cardTitle: 'text-white font-tech uppercase font-bold text-sm tracking-wide flex items-center gap-2',
  label: 'text-[10px] font-bold uppercase tracking-[0.18em] text-white/70',
  body: 'text-sm text-white/85',
  muted: 'text-white/55 text-sm',
  input:
    'w-full rounded-md bg-black/50 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-xeption-gold/60 focus:ring-2 focus:ring-xeption-gold/20 transition-colors duration-200',
  btnPrimary:
    'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-xeption-gold text-black text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xeption-gold/50',
  btnGhost:
    'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-white/15 text-white text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
  navActive:
    'bg-xeption-gold text-black shadow-[0_0_20px_rgba(255,215,0,0.25)]',
  navIdle:
    'text-white/90 hover:bg-white/8 hover:text-white',
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xeption-gold/40',
  hintCard:
    'rounded-lg border border-white/15 bg-black/25 backdrop-blur-sm px-4 py-2.5',
  tableHead:
    'sticky top-0 z-20 bg-black/50 backdrop-blur-md text-white/70 text-xs uppercase font-bold tracking-wider',
  tableBody: 'divide-y divide-white/5 text-white/85 text-sm',
  emptyCell: 'px-6 py-12 text-center text-white/55 text-sm',
  segmentGroup: 'inline-flex gap-1 rounded-lg border border-white/10 bg-black/40 p-1',
  segmentBtn: (active: boolean) =>
    `inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xeption-gold/40 ${
      active ? 'bg-xeption-gold text-black' : 'text-white/70 hover:text-white hover:bg-white/8'
    }`,
} as const;

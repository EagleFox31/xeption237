/**
 * Xeption Admin ERP — tokens UI (ui-ux-pro-max : Data-Dense Dashboard + Soft UI, React/Tailwind).
 * Source visuelle unique pour tout le staff portal.
 */

export const adminUi = {
  page: 'min-h-screen text-white selection:bg-xeption-gold selection:text-black',
  main: 'md:ml-64 min-h-screen relative z-10',
  content: 'max-w-[1600px] mx-auto px-4 md:px-8 pb-28 md:pb-10 pt-2 md:pt-3',
  surface:
    'bg-black/25 backdrop-blur-md border border-white/10 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.15)]',
  surfaceHover: 'hover:border-white/20 transition-colors duration-200',
  card: 'bg-black/25 backdrop-blur-md border border-white/10 rounded-lg p-5 md:p-6',
  pageHeaderCard:
    'relative overflow-hidden bg-xeption-gold border border-black/15 rounded-lg px-4 py-2 md:px-5 md:py-2.5 shadow-[0_4px_28px_rgba(255,215,0,0.28)]',
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

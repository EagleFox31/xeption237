import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageCircle, RefreshCw, Smartphone, Camera } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface MarketplaceListing {
  id: string;
  created_at: string;
  device_brand: string;
  device_model: string;
  grade: string;
  imei_status: string | null;
  ram_gb: number | null;
  storage_gb: number | null;
  accessories: string[];
  price_min: number;
  price_max: number;
  city: string | null;
  photo_urls: string[];
}

const formatF = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n));

const timeAgo = (iso: string): string => {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "À l'instant";
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Il y a ${d}j`;
  return `Il y a ${Math.floor(d / 7)}sem`;
};

const gradeStyle = (grade: string) => {
  if (grade === 'A') return { pill: 'bg-emerald-400/15 border-emerald-400/50 text-emerald-400', dot: '#34d399' };
  if (grade === 'B') return { pill: 'bg-amber-400/15 border-amber-400/50 text-amber-300', dot: '#fbbf24' };
  return { pill: 'bg-orange-400/15 border-orange-400/50 text-orange-400', dot: '#fb923c' };
};

const fuzzyMatch = (text: string, query: string): boolean => {
  const t = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const q = query.toLowerCase().trim();
  if (!q) return true;

  // 1. Substring exact
  if (t.includes(q)) return true;

  // 2. Chaque mot du query trouvé comme substring
  const words = q.split(/\s+/);
  if (words.length > 1 && words.every((w) => t.includes(w))) return true;

  // 3. Sous-séquence : toutes les lettres de q apparaissent dans l'ordre dans t
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  if (qi === q.length) return true;

  // 4. Tolérance 1 lettre : on retire chaque caractère du query et on teste
  if (q.length >= 4) {
    for (let s = 0; s < q.length; s++) {
      const variant = q.slice(0, s) + q.slice(s + 1);
      if (t.includes(variant)) return true;
    }
  }

  return false;
};

const PRICE_FILTERS = [
  { label: 'Tous', min: 0, max: Infinity },
  { label: '< 100k', min: 0, max: 100_000 },
  { label: '100k – 300k', min: 100_000, max: 300_000 },
  { label: '> 300k', min: 300_000, max: Infinity },
];

const buildContactMessage = (l: MarketplaceListing): string => {
  const device = l.device_model.toLowerCase().startsWith(l.device_brand.toLowerCase())
    ? l.device_model : `${l.device_brand} ${l.device_model}`.trim();
  const specs = [l.ram_gb ? `${l.ram_gb} Go RAM` : '', l.storage_gb ? `${l.storage_gb} Go` : ''].filter(Boolean).join(' · ');
  return [
    'INTÉRÊT MARKETPLACE — XEPTION NETWORK',
    '',
    `Appareil : ${device}`,
    `Grade ${l.grade}${specs ? ' · ' + specs : ''}`,
    `Prix : ${formatF(l.price_min)} – ${formatF(l.price_max)} FCFA`,
    `Référence annonce : ${l.id.slice(0, 8).toUpperCase()}`,
    '',
    'Bonjour Xeption, je suis intéressé par cet appareil sur votre marketplace.',
    'Merci de me mettre en contact avec le vendeur.',
  ].join('\n');
};

const SkeletonCard: React.FC = () => (
  <div className="rounded-2xl bg-[#0f0f13] border border-white/8 overflow-hidden animate-pulse">
    <div className="h-36 bg-white/5" />
    <div className="p-3 space-y-2">
      <div className="h-3.5 w-3/4 bg-white/8 rounded" />
      <div className="flex gap-1.5">
        <div className="h-4 w-12 bg-white/6 rounded-full" />
        <div className="h-4 w-16 bg-white/6 rounded-full" />
      </div>
      <div className="h-4 w-full bg-white/8 rounded" />
      <div className="h-8 w-full bg-white/5 rounded-xl" />
    </div>
  </div>
);

const ListingCard: React.FC<{ listing: MarketplaceListing }> = ({ listing: l }) => {
  const gs = gradeStyle(l.grade);
  const device = l.device_model.toLowerCase().startsWith(l.device_brand.toLowerCase())
    ? l.device_model : `${l.device_brand} ${l.device_model}`.trim();
  const waUrl = `https://wa.me/237641891031?text=${encodeURIComponent(buildContactMessage(l))}`;
  const photos = l.photo_urls ?? [];

  return (
    <div className="rounded-2xl bg-[#0f0f13] border border-white/10 overflow-hidden flex flex-col">

      {/* Zone image / carousel */}
      {photos.length > 0 ? (
        <div className="relative h-36 w-full shrink-0 overflow-hidden">
          <div className="flex h-full w-full overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {photos.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={device}
                className="min-w-full h-full object-cover snap-start"
                loading="lazy"
              />
            ))}
          </div>
          {/* Badge photo count */}
          {photos.length > 1 && (
            <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-tech">
              <Camera className="w-2.5 h-2.5" />
              {photos.length}
            </div>
          )}
          {/* Grade overlay */}
          <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-tech font-black border backdrop-blur-sm ${gs.pill} bg-black/50`}>
            Grade {l.grade}
          </div>
        </div>
      ) : (
        <div className="relative h-24 bg-gradient-to-br from-zinc-800/40 to-zinc-900/60 flex items-center justify-center shrink-0">
          <Smartphone className="w-8 h-8 text-zinc-700" />
          <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-tech font-black border ${gs.pill}`}>
            Grade {l.grade}
          </div>
        </div>
      )}

      {/* Infos */}
      <div className="p-2.5 flex flex-col gap-2 flex-1">
        {/* Nom + date */}
        <div className="flex items-start justify-between gap-1">
          <div className="text-white font-tech font-bold text-[12px] leading-snug line-clamp-2 flex-1">{device}</div>
          <span className="text-zinc-600 text-[9px] font-sans shrink-0 mt-0.5">{timeAgo(l.created_at)}</span>
        </div>

        {/* Pastilles specs */}
        {(l.storage_gb || l.ram_gb) && (
          <div className="flex gap-1 flex-wrap">
            {l.storage_gb && (
              <span className="px-2 py-0.5 rounded-full bg-white/6 border border-white/10 text-zinc-300 text-[9px] font-tech">{l.storage_gb} Go</span>
            )}
            {l.ram_gb && (
              <span className="px-2 py-0.5 rounded-full bg-white/6 border border-white/10 text-zinc-300 text-[9px] font-tech">{l.ram_gb} Go RAM</span>
            )}
          </div>
        )}

        {/* Prix — 1 ligne */}
        <div className="font-tech font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ffe680] to-[#f5bf26] text-[12px] truncate">
          {formatF(l.price_min)} – {formatF(l.price_max)} F
        </div>

        {/* CTA */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#075e54] hover:bg-[#128c7e] border border-emerald-500/20 text-white font-tech font-black text-[10px] uppercase tracking-wider transition-colors active:scale-[0.97]"
        >
          <MessageCircle className="w-3 h-3 shrink-0" />
          Je veux ça
        </a>
      </div>
    </div>
  );
};

export const MarketplaceBrowsePage: React.FC = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priceFilter, setPriceFilter] = useState(0);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('marketplace_listings')
      .select('id,created_at,device_brand,device_model,grade,imei_status,ram_gb,storage_gb,accessories,price_min,price_max,city,photo_urls')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    setListings(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const { min: fMin, max: fMax } = PRICE_FILTERS[priceFilter];
  const filtered = useMemo(() => listings.filter((l) => {
    const matchPrice = l.price_max >= fMin && l.price_min <= fMax;
    const matchSearch = fuzzyMatch(`${l.device_brand} ${l.device_model}`, search);
    return matchPrice && matchSearch;
  }), [listings, fMin, fMax, search]);

  return (
    <div className="w-full min-h-screen bg-[#09090c] pb-28 relative">

      {/* Header sticky */}
      <div className="sticky top-0 z-30 bg-[#09090c]/95 backdrop-blur-xl border-b border-white/8 px-4 pt-3 pb-3">

        {/* Recherche */}
        <div className="relative mb-2.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="iPhone, Samsung, Xiaomi…"
            className="w-full bg-[#171720] border border-white/12 rounded-xl pl-9 pr-3 py-2 text-white text-[12px] font-sans placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40 transition-colors"
          />
        </div>

        {/* Filtres prix + actualiser */}
        <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden pb-0.5 items-center">
          {PRICE_FILTERS.map((f, i) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setPriceFilter(i)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-tech font-bold border transition-all ${
                priceFilter === i
                  ? 'bg-amber-400/20 border-amber-400/50 text-amber-300'
                  : 'bg-white/5 border-white/10 text-zinc-400'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={fetch}
            className="ml-auto shrink-0 p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Actualiser"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Corps */}
      <div className="px-4 pt-3">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Smartphone className="w-10 h-10 text-zinc-600 mb-3" />
            <div className="text-white font-tech font-bold text-[14px] mb-1">
              {search ? 'Aucun résultat' : 'Aucune annonce pour l\'instant'}
            </div>
            <div className="text-zinc-400 text-[11px] font-sans mb-6">
              {search ? 'Essaie un autre modèle' : 'Sois le premier à publier'}
            </div>
            <button
              type="button"
              onClick={() => navigate('/marketplace/lister')}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-tech font-black text-[12px] uppercase tracking-wider"
            >
              Lister mon appareil
            </button>
          </div>
        ) : (
          <>
            <div className="text-zinc-500 text-[10px] font-sans mb-2.5">
              {filtered.length} annonce{filtered.length > 1 ? 's' : ''}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default MarketplaceBrowsePage;

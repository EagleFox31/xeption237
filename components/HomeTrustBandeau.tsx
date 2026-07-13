import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Truck, ShieldCheck, Smartphone, CheckCircle2, MapPin } from 'lucide-react';
import { DeliveryZone } from '../types';
import {
  DeliveryZoneModal,
  NATIONWIDE_DELIVERY_LABEL,
  shortCityLabel,
  useDeliveryZones,
} from './delivery/deliveryZoneUi';

const features = [
  { icon: Truck, title: 'Livraison Express', iconColor: 'text-blue-400' },
  { icon: Smartphone, title: 'Paiement Mobile', iconColor: 'text-white' },
  { icon: ShieldCheck, title: 'Garantie Incluse', iconColor: 'text-green-400' },
  { icon: CheckCircle2, title: '100% Authentique', iconColor: 'text-xeption-gold' },
];

const VISIBLE_COUNT = 3;
const GAP_PX = 8;
const CAROUSEL_INTERVAL_MS = 6000;
const TRANSITION_MS = 1200;

type CarouselItem =
  | { type: 'trust'; title: string; icon: typeof Truck; iconColor: string }
  | { type: 'nationwide' }
  | { type: 'zone'; zone: DeliveryZone };

const pillClass =
  'flex items-center gap-1.5 w-full min-w-0 rounded-full border border-white/10 bg-[#09090b]/90 backdrop-blur-xl px-2 py-2 shadow-sm justify-center';

const HomeTrustBandeau: React.FC = () => {
  const { zones, selectedZone, setSelectedZone, isLoading } = useDeliveryZones();
  const [modalOpen, setModalOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const carouselItems = useMemo<CarouselItem[]>(() => {
    const trustItems: CarouselItem[] = features.map((f) => ({
      type: 'trust',
      title: f.title,
      icon: f.icon,
      iconColor: f.iconColor,
    }));
    const deliveryItems: CarouselItem[] = [{ type: 'nationwide' }];
    zones.forEach((zone) => deliveryItems.push({ type: 'zone', zone }));
    return [...trustItems, ...deliveryItems];
  }, [zones]);

  const pageCount = Math.max(1, carouselItems.length - VISIBLE_COUNT + 1);
  const maxIndex = pageCount - 1;

  const pageLabels = useMemo(
    () =>
      Array.from({ length: pageCount }, (_, i) => {
        const first = carouselItems[i];
        if (!first) return `Slide ${i + 1}`;
        if (first.type === 'nationwide') return 'Tout le 237';
        if (first.type === 'zone') return shortCityLabel(first.zone.name);
        return first.title;
      }),
    [pageCount, carouselItems]
  );

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const update = () => setTrackWidth(el.clientWidth);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('orientationchange', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  useEffect(() => {
    if (index > maxIndex) setIndex(maxIndex);
  }, [index, maxIndex]);

  const goNext = useCallback(() => {
    setIndex((i) => (i >= maxIndex ? 0 : i + 1));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? maxIndex : i - 1));
  }, [maxIndex]);

  useEffect(() => {
    if (pageCount <= 1 || paused) return;
    const id = window.setInterval(goNext, CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [pageCount, paused, goNext]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setPaused(true);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const delta = e.changedTouches[0].clientX - touchStart;
    if (delta > 50) goPrev();
    if (delta < -50) goNext();
    setTouchStart(null);
    window.setTimeout(() => setPaused(false), 5000);
  };

  const openModal = (zone?: DeliveryZone) => {
    if (zone) setSelectedZone(zone);
    setModalOpen(true);
    setPaused(true);
  };

  const translatePx = trackWidth > 0 ? index * trackWidth : 0;
  const itemWidth =
    trackWidth > 0 ? (trackWidth - GAP_PX * (VISIBLE_COUNT - 1)) / VISIBLE_COUNT : 0;

  const renderItem = (item: CarouselItem) => {
    if (item.type === 'trust') {
      const Icon = item.icon;
      return (
        <div className={pillClass}>
          <Icon className={`w-3.5 h-3.5 shrink-0 ${item.iconColor}`} strokeWidth={1.5} />
          <span className="text-white font-tech font-bold uppercase text-[9px] tracking-wide truncate min-w-0">
            {item.title}
          </span>
        </div>
      );
    }

    if (item.type === 'nationwide') {
      return (
        <button
          type="button"
          onClick={() => openModal()}
          className={`${pillClass} hover:border-xeption-gold/50 transition-colors`}
        >
          <Truck className="w-3.5 h-3.5 shrink-0 text-xeption-gold" strokeWidth={1.5} />
          <span className="text-white font-tech font-bold uppercase text-[9px] tracking-wide truncate min-w-0">
            {NATIONWIDE_DELIVERY_LABEL}
          </span>
        </button>
      );
    }

    const city = shortCityLabel(item.zone.name);
    return (
      <button
        type="button"
        onClick={() => openModal(item.zone)}
        className={`${pillClass} hover:border-xeption-gold/50 transition-colors`}
      >
        <MapPin className="w-3.5 h-3.5 shrink-0 text-xeption-gold" strokeWidth={1.5} />
        <span className="text-white font-tech font-bold uppercase text-[9px] tracking-wide truncate min-w-0">
          Livrer à · {city}
        </span>
      </button>
    );
  };

  return (
    <section
      className="relative z-30 w-full min-w-0 max-w-[1400px] mx-auto px-2 sm:px-6 lg:px-8 pt-2 pb-1 box-border"
      aria-label="Réassurance et livraison"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative w-full min-w-0">
        <div
          ref={trackRef}
          className="w-full min-w-0 overflow-hidden touch-pan-y"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex min-w-0 ease-in-out will-change-transform"
            style={{
              transitionProperty: 'transform',
              transitionDuration: `${TRANSITION_MS}ms`,
              transform: `translate3d(-${translatePx}px, 0, 0)`,
            }}
          >
            {Array.from({ length: pageCount }, (_, pageIdx) => (
              <div
                key={pageIdx}
                className="shrink-0 box-border flex items-center min-w-0"
                style={{ width: trackWidth > 0 ? trackWidth : '100%' }}
              >
                <div className="flex w-full min-w-0 items-center" style={{ gap: GAP_PX }}>
                  {Array.from({ length: VISIBLE_COUNT }, (_, slot) => {
                    const item = carouselItems[pageIdx + slot];
                    if (!item) {
                      return (
                        <div
                          key={slot}
                          className="shrink-0 min-w-0"
                          style={{
                            width: itemWidth > 0 ? itemWidth : `${100 / VISIBLE_COUNT}%`,
                          }}
                        />
                      );
                    }
                    return (
                      <div
                        key={
                          item.type === 'zone'
                            ? item.zone.id
                            : item.type === 'trust'
                              ? item.title
                              : 'nationwide'
                        }
                        className="shrink-0 box-border flex items-center justify-center min-w-0"
                        style={{
                          width: itemWidth > 0 ? itemWidth : `${100 / VISIBLE_COUNT}%`,
                        }}
                      >
                        {renderItem(item)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {pageCount > 1 && (
          <div className="flex justify-center gap-1.5 mt-2">
            {pageLabels.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all shrink-0 ${
                  i === index ? 'w-5 bg-xeption-gold' : 'w-1.5 bg-white/30'
                }`}
                aria-label={label}
              />
            ))}
          </div>
        )}
      </div>

      {!isLoading && selectedZone && (
        <DeliveryZoneModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setPaused(false);
          }}
          zones={zones}
          selectedZone={selectedZone}
          onSelectZone={setSelectedZone}
        />
      )}
    </section>
  );
};

export default HomeTrustBandeau;

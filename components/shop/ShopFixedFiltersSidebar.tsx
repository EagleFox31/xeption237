import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ShopFixedFiltersSidebarProps {
  children: React.ReactNode;
  /** Barre sticky des filtres actifs — le panneau se cale juste en dessous. */
  toolbarRef: React.RefObject<HTMLElement | null>;
}

const GAP_BELOW_TOOLBAR_PX = 8;
/** Doit correspondre au `top-[132px]` de la barre filtres actifs (shop). */
const TOOLBAR_STICKY_TOP_PX = 132;
const TOOLBAR_FALLBACK_HEIGHT_PX = 56;

const panelShellClass =
  'flex flex-col rounded-md bg-[#0a0a0a] shadow-[0_4px_24px_rgba(0,0,0,0.6)] border border-white/15';

const getScrollParents = (node: HTMLElement | null): (HTMLElement | Window)[] => {
  const out: (HTMLElement | Window)[] = [window];
  let el = node?.parentElement ?? null;
  while (el) {
    const { overflowY, overflow } = getComputedStyle(el);
    if (/(auto|scroll|overlay)/.test(overflowY) || /(auto|scroll|overlay)/.test(overflow)) {
      out.push(el);
    }
    el = el.parentElement;
  }
  return out;
};

/**
 * Colonne filtres shop (desktop).
 * `position: sticky` est cassé par les `overflow-x-clip` de App — on pin en `fixed`
 * dès que le rail atteint le bandeau, pour qu’il reste visible au scroll.
 */
const ShopFixedFiltersSidebar: React.FC<ShopFixedFiltersSidebarProps> = ({
  children,
  toolbarRef,
}) => {
  const slotRef = useRef<HTMLDivElement>(null);
  const flowPanelRef = useRef<HTMLDivElement>(null);
  const pinnedPanelRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [coords, setCoords] = useState<{
    left: number;
    width: number;
    pinTop: number;
    maxHeight: number;
  } | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const panelHeightRef = useRef(0);
  const [isLg, setIsLg] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onMq = () => setIsLg(mq.matches);
    onMq();
    mq.addEventListener('change', onMq);
    return () => mq.removeEventListener('change', onMq);
  }, []);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot || !isLg) {
      setPinned(false);
      setCoords(null);
      return;
    }

    const sync = () => {
      const toolbar = toolbarRef.current;
      const toolbarHeight = toolbar?.offsetHeight ?? TOOLBAR_FALLBACK_HEIGHT_PX;
      const preferredTop = TOOLBAR_STICKY_TOP_PX + toolbarHeight + GAP_BELOW_TOOLBAR_PX;
      const slotRect = slot.getBoundingClientRect();
      const measured =
        pinnedPanelRef.current?.offsetHeight ||
        flowPanelRef.current?.offsetHeight ||
        panelHeightRef.current ||
        320;

      if (flowPanelRef.current) {
        panelHeightRef.current = flowPanelRef.current.offsetHeight;
        setPanelHeight(panelHeightRef.current);
      } else if (pinnedPanelRef.current) {
        panelHeightRef.current = pinnedPanelRef.current.offsetHeight;
        setPanelHeight(panelHeightRef.current);
      }

      const maxTop = slotRect.bottom - measured - GAP_BELOW_TOOLBAR_PX;
      const top = Math.min(preferredTop, maxTop);
      const available = slotRect.bottom - top - GAP_BELOW_TOOLBAR_PX;
      const viewportCap = window.innerHeight - preferredTop - 16;

      setCoords({
        left: slotRect.left,
        width: slotRect.width,
        pinTop: top,
        maxHeight: Math.max(120, Math.min(viewportCap, available)),
      });
      setPinned(slotRect.top <= preferredTop + 1);
    };

    sync();
    const scrollParents = getScrollParents(slot);
    scrollParents.forEach((target) => {
      target.addEventListener('scroll', sync, { passive: true, capture: true });
    });
    window.addEventListener('resize', sync);

    const ro = new ResizeObserver(sync);
    ro.observe(slot);
    if (toolbarRef.current) ro.observe(toolbarRef.current);
    if (flowPanelRef.current) ro.observe(flowPanelRef.current);

    return () => {
      scrollParents.forEach((target) => {
        target.removeEventListener('scroll', sync, { capture: true });
      });
      window.removeEventListener('resize', sync);
      ro.disconnect();
    };
  }, [isLg, toolbarRef]);

  const maxHeight = coords != null ? `${coords.maxHeight}px` : undefined;

  const panelContent = (
    <>
      <div className="shrink-0 px-4 pt-4 pb-2">
        <p className="text-xs font-tech font-bold uppercase tracking-widest text-white border-b border-white/10 pb-2">
          Filtres
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar px-4 pb-4">
        {children}
      </div>
    </>
  );

  return (
    <>
      <div ref={slotRef} className="hidden lg:block w-[260px] shrink-0">
        {!pinned ? (
          <div ref={flowPanelRef} className={panelShellClass} style={{ maxHeight }}>
            {panelContent}
          </div>
        ) : (
          <div aria-hidden style={{ height: panelHeight > 0 ? panelHeight : 320 }} />
        )}
      </div>

      {isLg && pinned && coords
        ? createPortal(
            <div
              ref={pinnedPanelRef}
              className={`${panelShellClass} fixed z-[45]`}
              style={{
                top: coords.pinTop,
                left: coords.left,
                width: coords.width,
                maxHeight,
              }}
              role="complementary"
              aria-label="Filtres boutique"
            >
              {panelContent}
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

export default ShopFixedFiltersSidebar;

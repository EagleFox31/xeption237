import React from 'react';
import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import { adminUi } from '../shared/adminUi';

type BackToShopLinkProps = {
  variant?: 'sidebar' | 'compact' | 'sheet';
  onNavigate?: () => void;
};

const BackToShopLink: React.FC<BackToShopLinkProps> = ({
  variant = 'sidebar',
  onNavigate,
}) => {
  if (variant === 'compact') {
    return (
      <Link
        to="/shop"
        onClick={onNavigate}
        className={`inline-flex items-center justify-center p-2 rounded-md text-white/85 hover:text-xeption-gold hover:bg-white/10 transition-colors duration-200 ${adminUi.focusRing}`}
        aria-label="Retour au shop"
        title="Retour au shop"
      >
        <Store className="w-5 h-5" />
      </Link>
    );
  }

  const className =
    variant === 'sheet'
      ? `w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-white/15 text-white text-xs font-bold uppercase tracking-wider hover:border-xeption-gold/40 hover:text-xeption-gold transition-colors duration-200 ${adminUi.focusRing}`
      : `w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-white/15 text-white text-xs font-bold uppercase tracking-wider hover:bg-white/10 hover:border-xeption-gold/35 hover:text-xeption-gold transition-all duration-200 ${adminUi.focusRing}`;

  return (
    <Link to="/shop" onClick={onNavigate} className={className}>
      <Store className="w-4 h-4 shrink-0" />
      Retour au shop
    </Link>
  );
};

export default BackToShopLink;

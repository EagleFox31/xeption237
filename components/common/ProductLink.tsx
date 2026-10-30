import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../../types';
import { productPath } from '../../utils/routes';

interface ProductLinkProps {
  product: Product;
  /** Comportement existant (navigate + state, analytics…) : appelé sur clic simple. */
  onOpen?: (product: Product) => void;
  state?: unknown;
  /** Étire la zone cliquable sur tout l'ancêtre `relative` (pattern « stretched link »). */
  stretched?: boolean;
  className?: string;
  children: React.ReactNode;
  'aria-label'?: string;
}

const isModifiedClick = (e: React.MouseEvent) => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

/**
 * Lien produit crawlable (`<a href="/product/...">`) : les moteurs suivent le href,
 * l'utilisateur garde le parcours existant via `onOpen`. Ctrl/Cmd-clic ouvre un onglet.
 * Les boutons de la carte doivent être frères du lien (jamais imbriqués) et en `relative z-20`.
 */
const ProductLink: React.FC<ProductLinkProps> = ({ product, onOpen, state, stretched, className = '', children, ...rest }) => (
  <Link
    to={productPath(product)}
    state={state}
    onClick={(e) => {
      e.stopPropagation();
      if (!onOpen || isModifiedClick(e)) return;
      e.preventDefault();
      onOpen(product);
    }}
    className={`${stretched ? "after:content-[''] after:absolute after:inset-0 after:z-10 " : ''}focus:outline-none focus-visible:ring-2 focus-visible:ring-xeption-gold rounded-sm ${className}`}
    {...rest}
  >
    {children}
  </Link>
);

export default ProductLink;

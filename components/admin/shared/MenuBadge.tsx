import React from 'react';

interface MenuBadgeProps {
  count: number;
  className?: string;
}

const MenuBadge: React.FC<MenuBadgeProps> = ({ count, className = '' }) => {
  if (count <= 0) return null;

  const label = count > 99 ? '99+' : String(count);

  return (
    <span
      className={`inline-flex min-w-[1.125rem] h-[1.125rem] items-center justify-center rounded-full bg-xeption-red px-1 text-[9px] font-bold text-white tabular-nums ${className}`}
      aria-label={`${count} en attente`}
    >
      {label}
    </span>
  );
};

export default MenuBadge;

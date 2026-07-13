import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { adminUi } from '../shared/adminUi';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  actions,
}) => (
  <header
    className={`mb-4 md:mb-6 ${adminUi.pageHeaderCard} group animate-in fade-in slide-in-from-top-2 duration-500 fill-mode-both`}
  >
    <div
      className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.35)_50%,transparent_65%)] -translate-x-full motion-safe:group-hover:translate-x-full transition-transform duration-[1400ms] ease-out"
      aria-hidden
    />

    <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="min-w-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
          {Icon && (
            <Icon
              className="w-4 h-4 md:w-[18px] md:h-[18px] text-black shrink-0 self-center -translate-y-px animate-in zoom-in-95 duration-400 delay-75 fill-mode-both motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-6 transition-transform duration-300"
              aria-hidden
            />
          )}
          <h1
            className={`text-lg md:text-xl leading-tight ${adminUi.pageHeaderTitle} shrink-0 animate-in fade-in slide-in-from-left-2 duration-400 delay-100 fill-mode-both`}
          >
            {title}
          </h1>
          {description && (
            <>
              <span
                className="text-black/35 font-bold shrink-0 animate-in fade-in duration-300 delay-150 fill-mode-both"
                aria-hidden
              >
                :
              </span>
              <p
                className={`${adminUi.pageHeaderDesc} min-w-[10rem] flex-1 animate-in fade-in slide-in-from-left-1 duration-400 delay-200 fill-mode-both`}
              >
                {description}
              </p>
            </>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:pl-2 animate-in fade-in zoom-in-95 duration-400 delay-300 fill-mode-both">
          {actions}
        </div>
      )}
    </div>
  </header>
);

export default AdminPageHeader;

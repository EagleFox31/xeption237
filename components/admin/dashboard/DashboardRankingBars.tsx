import React from 'react';
import { adminUi } from '../shared/adminUi';

interface BarRow {
  id: string;
  label: string;
  sublabel?: string;
  value: number;
  displayValue: string;
}

interface DashboardRankingBarsProps {
  title: string;
  icon: React.ReactNode;
  rows: BarRow[];
  emptyMessage: string;
  accentClass?: string;
}

const DashboardRankingBars: React.FC<DashboardRankingBarsProps> = ({
  title,
  icon,
  rows,
  emptyMessage,
  accentClass = 'bg-xeption-gold',
}) => {
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <section className={`${adminUi.card} flex flex-col h-full`}>
      <h3 className={`${adminUi.cardTitle} mb-4`}>
        {icon}
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className={adminUi.muted}>{emptyMessage}</p>
      ) : (
        <ul className="space-y-3 flex-1">
          {rows.map((row, i) => (
            <li key={row.id}>
              <div className="flex justify-between items-baseline gap-2 mb-1">
                <div className="min-w-0">
                  <span className="text-sm text-white font-medium truncate block">{row.label}</span>
                  {row.sublabel && (
                    <span className="text-[10px] text-white/50 truncate block">{row.sublabel}</span>
                  )}
                </div>
                <span className="text-xs font-mono text-white/90 shrink-0 tabular-nums">{row.displayValue}</span>
              </div>
              <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${accentClass} ${i === 0 ? 'opacity-100' : 'opacity-80'}`}
                  style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default DashboardRankingBars;

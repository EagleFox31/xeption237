import React, { useState } from 'react';
import { ArrowLeftRight, RefreshCw, TrendingDown } from 'lucide-react';
import type { TradeInRequest, TrocSession, TrocPayment } from '../../../types';
import type { TransitionResult } from '../../../hooks/admin/useTrocManager';
import { adminUi } from '../shared/adminUi';
import TrocTab from './TrocTab';
import ArgusTab from './ArgusTab';
import MarketReferenceTab from './MarketReferenceTab';

type TrocWorkspaceSection = 'dossiers' | 'argus' | 'marche';

interface TrocWorkspaceTabProps {
  requests: TradeInRequest[];
  sessions: TrocSession[];
  payments: TrocPayment[];
  isLoadingPayments?: boolean;
  onRefresh?: () => void;
  onTransition: (
    id: string,
    to: TradeInRequest['status'],
    opts?: { reason?: string },
  ) => Promise<TransitionResult>;
}

const SECTIONS: Array<{
  id: TrocWorkspaceSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dossiers', label: 'Dossiers', icon: ArrowLeftRight },
  { id: 'argus', label: 'Argus', icon: RefreshCw },
  // Prix constates ailleurs : l'ancrage externe du troc, saisi au comptoir.
  { id: 'marche', label: 'Prix marche', icon: TrendingDown },
];

const TrocWorkspaceTab: React.FC<TrocWorkspaceTabProps> = ({
  requests,
  sessions,
  payments,
  isLoadingPayments,
  onRefresh,
  onTransition,
}) => {
  const [activeSection, setActiveSection] = useState<TrocWorkspaceSection>('dossiers');

  return (
    <div className="flex flex-col h-[calc(100vh-132px)] min-h-0 gap-3">
      <div className="flex items-center gap-3 shrink-0">
        <div className={adminUi.segmentGroup}>
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={adminUi.segmentBtn(isActive)}
              >
                <Icon className="h-3.5 w-3.5" />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {activeSection === 'dossiers' && (
          <TrocTab
            requests={requests}
            sessions={sessions}
            payments={payments}
            isLoadingPayments={isLoadingPayments}
            onRefresh={onRefresh}
            onTransition={onTransition}
          />
        )}
        {activeSection === 'argus' && <ArgusTab />}
        {activeSection === 'marche' && (
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <MarketReferenceTab />
          </div>
        )}
      </div>
    </div>
  );
};

export default TrocWorkspaceTab;

import type { DeviceCategoryId } from '../../types';
import type { TradeInEngine, TradeInProfile } from './shared/commonTypes';
import { phoneProfile } from './profiles/phoneProfile';
import { phoneEngine } from './engines/phoneEngine';
// Note: Other profiles and engines will be imported here as they are built

export function resolveTradeInProfile(category: DeviceCategoryId): TradeInProfile {
  switch (category) {
    case 'phone':
      return phoneProfile;
    // Fallback for other categories until they are implemented
    default:
      return phoneProfile;
  }
}

export function resolveTradeInEngine(category: DeviceCategoryId): TradeInEngine {
  switch (category) {
    case 'phone':
      return phoneEngine;
    default:
      return phoneEngine;
  }
}

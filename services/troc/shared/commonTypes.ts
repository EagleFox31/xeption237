import type {
  DeviceCategoryId,
  TrocDeviceForm,
  TrocEvaluationResult,
  TrocIdentifierType,
  TrocStep,
} from '../../../types';

export interface TradeInEngine {
  name: string;
  version: string;
  evaluate: (form: TrocDeviceForm, photoUrls: string[], basePrice: number) => Promise<TrocEvaluationResult>;
}

export interface TradeInProfile {
  category: DeviceCategoryId;
  steps: TrocStep[];
  stepLabels: Partial<Record<TrocStep, string>>;
  identifierType: TrocIdentifierType;
  requiredFields: (keyof TrocDeviceForm)[];
}

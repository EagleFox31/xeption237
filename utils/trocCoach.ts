export type ChameleoState = 'idle' | 'scanning' | 'happy' | 'thinking' | 'warning';

export const TROC_MISSIONS = [
  { id: 'device', label: 'Appareil' },
  { id: 'photos', label: 'Photos' },
  { id: 'fee', label: 'Frais' },
  { id: 'offer', label: 'Offre' },
  { id: 'voucher', label: 'Bon' },
] as const;

export type TrocCoachStep =
  | 'form'
  | 'photos'
  | 'imei'
  | 'payment'
  | 'evaluating'
  | 'result'
  | 'voucher';

export type TrocCoachInput = {
  step: TrocCoachStep | string;
  imeiStatus: string;
  imeiBlacklistStatus: string;
  isCheckingImei: boolean;
  photoCount: number;
  paymentState?: string;
  hasError?: boolean;
  /**
   * Avancement du formulaire d'appareil. Optionnel : la page Troc ne voit que
   * 4 des 5 conditions (l'état « l'appareil s'allume » reste local au
   * formulaire), le formulaire lui-même en passe 5. Chacun renseigne ce qu'il
   * voit, la fonction ne suppose rien.
   */
  formDone?: number;
  formTotal?: number;
  /** Libellé de la prochaine chose à remplir — sert à guider plutôt qu'à répéter. */
  formNext?: string;
  firstName?: string;
  deviceLabel?: string;
};

export type TrocCoachView = {
  state: ChameleoState;
  missionIndex: number;
  completedCount: number;
  title: string;
  message: string;
};

const STEP_MISSION: Record<string, number> = {
  form: 0,
  imei: 0,
  photos: 1,
  payment: 2,
  evaluating: 3,
  result: 3,
  voucher: 4,
};

export function resolveTrocCoach(input: TrocCoachInput): TrocCoachView {
  const missionIndex = STEP_MISSION[input.step] ?? 0;
  const completedCount = missionIndex;
  const blacklisted = input.imeiBlacklistStatus === 'blacklisted';

  if (blacklisted) {
    return {
      state: 'warning',
      missionIndex: 0,
      completedCount: 0,
      title: 'On s’arrête là',
      message: 'Cet IMEI est signalé. Passe en boutique, on ne reprend pas en ligne.',
    };
  }

  if (input.hasError && input.step === 'payment') {
    return {
      state: 'warning',
      missionIndex,
      completedCount,
      title: TROC_MISSIONS[missionIndex].label,
      message: 'Le paiement n’est pas passé. Réessaie, ou on te confirme sur WhatsApp.',
    };
  }

  if (input.isCheckingImei) {
    return {
      state: 'scanning',
      missionIndex: 0,
      completedCount: 0,
      title: 'Appareil',
      message: 'Je vérifie l’IMEI. Ne quitte pas, ça prend quelques secondes.',
    };
  }

  switch (input.step) {
    case 'form':
    case 'imei': {
      const who = input.firstName?.trim() ? ` ${input.firstName.trim()}` : '';
      const done = input.formDone ?? 0;
      const total = input.formTotal ?? 0;
      const allDone = total > 0 && done >= total;

      // Le scan d'abord : c'est le seul moment où la mascotte « travaille ».
      if (input.isCheckingImei) {
        return {
          state: 'scanning', missionIndex: 0, completedCount: 0, title: 'Appareil',
          message: 'Je lis ton IMEI… deux secondes.',
        };
      }

      if (input.imeiBlacklistStatus === 'blacklisted') {
        return {
          state: 'warning', missionIndex: 0, completedCount: 0, title: 'Appareil',
          message: 'Celui-là est signalé. Passe en boutique, on trouve une solution.',
        };
      }

      if (allDone) {
        return {
          state: 'happy', missionIndex: 0, completedCount: 0, title: 'Appareil',
          message: `C’est bon${who} ! Lance l’estimation, le reste c’est mon travail.`,
        };
      }

      // Juste après la reconnaissance : on nomme l'appareil, c'est la récompense.
      if (input.imeiStatus === 'valid' && input.deviceLabel) {
        return {
          state: 'happy', missionIndex: 0, completedCount: 0, title: 'Appareil',
          message: `${input.deviceLabel} — je le connais bien celui-là${who} !${input.formNext ? ` Il me manque ${input.formNext}.` : ''}`,
        };
      }

      return {
        state: input.imeiStatus === 'valid' ? 'happy' : 'idle',
        missionIndex: 0,
        completedCount: 0,
        title: 'Appareil',
        message: input.formNext
          ? (done === 0
              ? `On commence par ${input.formNext}.`
              : `${done} sur ${total}, ça avance. Maintenant ${input.formNext}.`)
          : 'Compose *#06# sur le téléphone à reprendre, prends le premier numéro.',
      };
    }
    case 'photos':
      return {
        state: input.photoCount > 0 ? 'thinking' : 'idle',
        missionIndex: 1,
        completedCount: 1,
        title: 'Photos',
        message:
          input.photoCount > 0
            ? 'Bien. Écran allumé, dos, et les défauts s’il y en a — net, pas de flou.'
            : 'Montre l’appareil comme au comptoir : écran, dos, côtés. Une photo nette vaut mieux que huit floues.',
      };
    case 'payment':
      if (
        input.paymentState === 'initiating' ||
        input.paymentState === 'pending' ||
        input.paymentState === 'polling'
      ) {
        return {
          state: 'scanning',
          missionIndex: 2,
          completedCount: 2,
          title: 'Frais',
          message: 'Paiement en cours. Confirme sur ton téléphone s’il le demande.',
        };
      }
      return {
        state: 'thinking',
        missionIndex: 2,
        completedCount: 2,
        title: 'Frais',
        message: 'Petit frais d’estimation, pas le paiement de l’appareil. Ensuite tu vois l’offre.',
      };
    case 'evaluating':
      return {
        state: 'scanning',
        missionIndex: 3,
        completedCount: 2,
        title: 'Offre',
        message: 'Je regarde tes photos. Reste là, l’estimation arrive.',
      };
    case 'result':
      return {
        state: 'happy',
        missionIndex: 3,
        completedCount: 3,
        title: 'Offre',
        message: 'Voilà la cote. Tu acceptes, tu refuses, ou tu viens la voir en boutique.',
      };
    case 'voucher':
      return {
        state: 'happy',
        missionIndex: 4,
        completedCount: 5,
        title: 'Bon',
        message: 'Bon en poche. Passe à Olembé avant la date indiquée.',
      };
    default:
      return {
        state: 'idle',
        missionIndex: 0,
        completedCount: 0,
        title: TROC_MISSIONS[0].label,
        message: 'On reprend ton téléphone, étape par étape.',
      };
  }
}

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { adminUi } from '../shared/adminUi';
import { TELEGRAM_MINIAPP_LINK } from '../../../constants/telegram';
import { createTelegramLinkCode } from '../../../services/telegramLinkService';
import { buildTelegramLinkUrl } from '../../../utils/telegramLink';
import { notifyError, notifyInfo } from '../../../utils/notify';

type LinkTelegramButtonProps = {
  variant?: 'sidebar' | 'compact';
};

/**
 * Associe le compte Telegram du staff connecté : code à usage unique, puis ouverture
 * de la Mini App (`startapp`). Aucun mot de passe ne transite par Telegram.
 */
const LinkTelegramButton: React.FC<LinkTelegramButtonProps> = ({ variant = 'sidebar' }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    // Fenêtre ouverte dans le geste utilisateur : un window.open après l'appel réseau
    // serait bloqué comme popup (Safari iOS notamment).
    const tab = window.open('', '_blank');
    setIsLoading(true);
    try {
      const { code } = await createTelegramLinkCode();
      const url = buildTelegramLinkUrl(TELEGRAM_MINIAPP_LINK, code);
      if (!url) throw new Error('Lien de la Mini App Telegram mal configuré.');
      if (tab) tab.location.href = url;
      else window.location.href = url;
      notifyInfo('Telegram ouvert', 'Le lien est valable 10 minutes, une seule fois.');
    } catch (error: unknown) {
      tab?.close();
      notifyError(error instanceof Error ? error.message : 'Association Telegram impossible.');
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={`inline-flex items-center justify-center p-2 rounded-md text-white/85 hover:text-xeption-gold hover:bg-white/10 transition-colors duration-200 disabled:opacity-50 ${adminUi.focusRing}`}
        aria-label="Lier mon Telegram"
        title="Lier mon Telegram"
      >
        <Send className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-white/15 text-white text-xs font-bold uppercase tracking-wider hover:bg-white/10 hover:border-xeption-gold/35 hover:text-xeption-gold transition-all duration-200 disabled:opacity-50 ${adminUi.focusRing}`}
    >
      <Send className="w-4 h-4 shrink-0" />
      {isLoading ? 'Ouverture…' : 'Lier mon Telegram'}
    </button>
  );
};

export default LinkTelegramButton;

/**
 * Lien d'ouverture de la Mini App staff avec un code d'association à usage unique.
 *
 * `base` accepte la Mini App principale du bot (`https://t.me/<bot>?startapp`) ou
 * une Mini App nommée (`https://t.me/<bot>/<app>`). Telegram transmet la valeur de
 * `startapp` à la Mini App (`start_param`), qui l'échange contre l'association.
 */
const TELEGRAM_HOST = 't.me';
const START_PARAM_RE = /^[A-Za-z0-9_-]{1,512}$/;

export const buildTelegramLinkUrl = (base: string, code: string): string | null => {
  if (!START_PARAM_RE.test(code)) return null;
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== TELEGRAM_HOST) return null;
  url.searchParams.set('startapp', code);
  return url.href;
};

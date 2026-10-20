import { supabase } from './supabaseClient';

export type TelegramLinkCode = { code: string; expiresAt: string };

/**
 * Demande un code d'association Telegram pour le membre du staff connecté.
 * La RPC vérifie la session et l'appartenance au staff ; le code vaut 10 min,
 * une seule fois, et un nouveau code annule le précédent.
 */
export const createTelegramLinkCode = async (): Promise<TelegramLinkCode> => {
  const { data, error } = await supabase.rpc('create_telegram_link_code');
  if (error) {
    console.error('create_telegram_link_code:', error);
    throw new Error('Impossible de générer le code Telegram pour le moment.');
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.code) throw new Error('Impossible de générer le code Telegram pour le moment.');
  return { code: String(row.code), expiresAt: String(row.expires_at) };
};

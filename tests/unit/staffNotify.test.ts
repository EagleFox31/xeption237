import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_STAFF_EVENT_TYPES,
  formatPlainNotification,
  notificationLink,
  parseEventTypes,
  type StaffNotification,
} from '../../supabase/functions/_shared/staffNotify';
import {
  createTelegramChannel,
  formatTelegramNotification,
} from '../../supabase/functions/_shared/staffNotifyChannels/telegram';

const lowStock: StaffNotification = {
  notification_id: 'n1',
  event_type: 'stock_low',
  title: 'Stock bas',
  message: 'Tecno Spark 50 — 2 restant(s)',
  link_to_tab: 'inventory',
};
const ctx = { siteUrl: 'https://www.xeptionetwork.shop' };

describe('contrat commun', () => {
  it('lit une liste d’événements séparée par des virgules', () => {
    expect(parseEventTypes(' stock_low, troc_submitted ,')).toEqual(['stock_low', 'troc_submitted']);
  });

  it('retombe sur la liste par défaut si vide', () => {
    expect(parseEventTypes(undefined)).toEqual([...DEFAULT_STAFF_EVENT_TYPES]);
  });

  it('formate un texte brut réutilisable par tout canal', () => {
    expect(formatPlainNotification(lowStock, ctx)).toBe(
      '📉 Stock bas\nTecno Spark 50\n• 2 restant(s)\nhttps://www.xeptionetwork.shop/admin/inventory',
    );
  });
});

describe('adaptateur Telegram', () => {
  it('formate en HTML : en-tête, sujet, détails', () => {
    expect(formatTelegramNotification(lowStock)).toBe('📉 <b>STOCK BAS</b>\n\n📱 <b><u>Tecno Spark 50</u></b>\n▫️ 2 restant(s)');
  });

  it('met les montants FCFA en forme', () => {
    const listing = {
      ...lowStock,
      event_type: 'marketplace_listed',
      title: 'Nouvelle annonce',
      message: 'Apple iPhone 12 — 4/128 Go — B — 45000 à 60000 FCFA — Douala',
    };
    expect(formatTelegramNotification(listing)).toBe(
      '🛒 <b>NOUVELLE ANNONCE</b>\n\n📱 <b><u>Apple iPhone 12</u></b>\n▫️ 4/128 Go\n▫️ B\n▫️ 45 000 à 60 000 FCFA\n▫️ Douala',
    );
  });

  it('échappe le HTML venu des données client', () => {
    const out = formatTelegramNotification({ ...lowStock, event_type: 'x', title: 'A<b>', message: 'R&D <script>' });
    expect(out).toBe('🔔 <b>A&lt;B&gt;</b>\n\n📱 <b><u>R&amp;D &lt;script&gt;</u></b>');
  });

  it('formate une alerte produit sans image', () => {
    const noImage: StaffNotification = {
      notification_id: 'n2',
      event_type: 'product_missing_image',
      title: 'Produit sans image',
      message: 'Samsung Galaxy Watch6 — Aucune photo HD renseignée — 95 000 FCFA — smartwatches',
    };
    expect(formatTelegramNotification(noImage)).toBe(
      '🖼️ <b>PRODUIT SANS IMAGE</b>\n\n📱 <b><u>Samsung Galaxy Watch6</u></b>\n▫️ Aucune photo HD renseignée\n▫️ 95 000 FCFA\n▫️ smartwatches',
    );
  });

  it('formate un dossier troc avec détails complets', () => {
    const troc: StaffNotification = {
      notification_id: 'n3',
      event_type: 'troc_submitted',
      title: 'Nouveau dossier troc',
      message:
        'iPhone 13 Pro 128 Go — Client : Jean Dupont (699000000) — État : Écran parfait, Corps micro_rayures, Batterie 89% — Offre estimée : 180000 FCFA cash / 198000 FCFA bon d’achat',
    };
    expect(formatTelegramNotification(troc)).toBe(
      '🔄 <b>NOUVEAU DOSSIER TROC</b>\n\n📱 <b><u>iPhone 13 Pro 128 Go</u></b>\n▫️ Client : Jean Dupont (699000000)\n▫️ État : Écran parfait, Corps micro_rayures, Batterie 89%\n▫️ Offre estimée : 180 000 FCFA cash / 198 000 FCFA bon d’achat',
    );
  });

  it('pointe vers la bonne destination', () => {
    const link = (tab: string | null) => notificationLink({ ...lowStock, link_to_tab: tab }, ctx).url;
    expect(link('marketplace')).toBe('https://www.xeptionetwork.shop/marketplace');
    expect(link('troc')).toBe('https://www.xeptionetwork.shop/admin/troc');
    expect(link('sav')).toBe('https://www.xeptionetwork.shop/admin/sav');
    expect(link(null)).toBe('https://www.xeptionetwork.shop/admin');
  });

  it('ouvre l’élément précis quand l’onglet le permet', () => {
    const link = (tab: string, id: string) => notificationLink({ ...lowStock, link_to_tab: tab, link_to_id: id }, ctx);
    expect(link('troc', 'abc-123')).toEqual({ label: 'Ouvrir le dossier', url: 'https://www.xeptionetwork.shop/admin/troc/abc-123' });
    expect(link('inventory', 'p 1/2').url).toBe('https://www.xeptionetwork.shop/admin/inventory/p%201%2F2');
    expect(link('marketplace', 'l1').url).toBe('https://www.xeptionetwork.shop/marketplace');
    expect(link('troc', '  ').url).toBe('https://www.xeptionetwork.shop/admin/troc');
  });

  it('est ignoré sans ses secrets', () => {
    expect(createTelegramChannel(() => undefined)).toBeNull();
  });

  it('envoie au chat configuré et remonte les erreurs', async () => {
    const env = (k: string) => ({ TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '-100', TELEGRAM_EVENT_TYPES: 'stock_low' })[k];
    const fetchOk = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const channel = createTelegramChannel(env, fetchOk as unknown as typeof fetch)!;
    expect(channel.id).toBe('telegram');
    expect(channel.eventTypes).toEqual(['stock_low']);
    expect(await channel.send(lowStock, ctx)).toBeNull();
    const [url, init] = fetchOk.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bottok/sendMessage');
    const body = JSON.parse(init.body);
    expect(body.chat_id).toBe('-100');
    expect(body.reply_markup.inline_keyboard[0][0]).toEqual({
      text: 'Voir le stock ↗',
      url: 'https://www.xeptionetwork.shop/admin/inventory',
    });

    const fetchKo = vi.fn().mockResolvedValue(new Response('chat not found', { status: 400 }));
    const failing = createTelegramChannel(env, fetchKo as unknown as typeof fetch)!;
    expect(await failing.send(lowStock, ctx)).toBe('telegram 400: chat not found');
  });

  it('formate les rappels temporels sur Telegram sans doubler les emojis de titre', () => {
    const stale: StaffNotification = {
      notification_id: 'n_stale',
      event_type: 'troc_stale',
      title: '⏱️ Troc en attente de contact',
      message: 'iPhone 13 — sans contact depuis > 48 h',
      link_to_tab: 'troc',
      link_to_id: 't-123',
    };
    expect(formatTelegramNotification(stale)).toBe(
      '⏱️ <b>TROC EN ATTENTE DE CONTACT</b>\n\n📱 <b><u>iPhone 13</u></b>\n▫️ sans contact depuis &gt; 48 h',
    );

    const debt: StaffNotification = {
      notification_id: 'n_debt',
      event_type: 'debt_overdue',
      title: '📋 Dettes en attente — Bastos',
      message: '2 dette(s) de plus de 7 j — 90 000 FCFA restants',
    };
    expect(formatTelegramNotification(debt)).toBe(
      '📋 <b>DETTES EN ATTENTE — BASTOS</b>\n\n📱 <b><u>2 dette(s) de plus de 7 j</u></b>\n▫️ 90 000 FCFA restants',
    );
  });
});

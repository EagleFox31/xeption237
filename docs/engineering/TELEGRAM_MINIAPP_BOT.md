# Xeption bot — Mini App discovery

We reuse **@Xeption_bot**, its existing `TELEGRAM_BOT_TOKEN` and Supabase `notify-staff` channel. No second Telegram bot is created.

The bot's conversation currently has no `/start` handler because notification sending is outgoing-only. New `telegram-bot-entry` Supabase Edge Function adds:

- `/start` and `/aide` in private chat with a Telegram `web_app` button to Trigenys Notify's Xeption Mini App staging URL.
- Persistent private-chat menu button `Ouvrir Xeption` via Bot API `setChatMenuButton`.
- `/start` and `/aide` commands via `setMyCommands`.
- Bot descriptions via `setMyDescription` and `setMyShortDescription`.

## One-time setup

`POST /functions/v1/telegram-bot-entry/configure` requires `x-cron-secret: <existing Xeption CRON_SECRET>`. Call through Supabase `pg_net` with the secret read from Vault and **never print or commit the secret**. The configuration call first checks `getWebhookInfo`. If a different webhook is already installed, it returns HTTP 409 and must not replace it.

The webhook is registered with a derived secret token (`SHA256('xeption-telegram-bot-entry:' || CRON_SECRET)`). Incoming Telegram calls lacking the matching `x-telegram-bot-api-secret-token` are refused. Group updates are ignored. The existing outgoing `notify-staff` function remains untouched.

Mini App is the Xeption interface hosted by Trigenys Notify; it revalidates Telegram `initData` and staff Xeption accounts. Bot messages are not proof of staff authorization.

**Mini App icon and public preview screenshots** are configured separately in BotFather; Telegram does not auto-generate these from the website. "No Preview" on the bot profile is cosmetic, and not a bot outage.

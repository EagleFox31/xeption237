-- bind_staff_by_phone (migrations 009/010 staff_telegram_user_id) is superseded by
-- telegram_staff_link_by_phone: it matched with LIMIT 1, silently moved an existing link,
-- allowed direction accounts and wrote no audit. Its default grants also exposed it to
-- anon/authenticated. The bot no longer calls it; keep it (reversible) but executable by nobody
-- except the owner. staff.telegram_user_id stays in place, unused.

REVOKE ALL ON FUNCTION public.bind_staff_by_phone(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;

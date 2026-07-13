# Historique — Refactor ERP & équipe staff

> Journal des livraisons **juin 2026** (sessions Agent Cursor).  
> Pour le tableau de bord global → [CHANTIERS.md](./CHANTIERS.md).

---

## Contexte

Refonte UX admin ERP, renommage des rôles en libellés métier boutique, automatisation Auth Supabase, menus filtrés par profil.

---

## Livraisons chronologiques

### Rôles & copy

- Remplacement `editor` / `manager` / `admin` → **vendeur** / **responsable** / **direction** / **super_admin**
- Migration SQL `20260620_001_staff_role_rename.sql`
- Libellés français dans `constants/staffRoles.ts` (highlights, idealFor)
- Super admin = équipe technique (dev), pas « fondateur »

### Connexion staff (`StaffLogin.tsx`)

- Parcours 2 étapes : identité → mot de passe
- Preview profil (nom, rôle, chips)
- Messages d’erreur boutique (pas de jargon)
- Mot de passe équipe : **`123456`**

### Création membre (`StaffEditorModal.tsx`)

- Wizard 3 étapes : profil → identité → validation
- Aperçu des menus selon le rôle choisi

### Auth automatique

- Edge function **`create-staff-auth`** (`provision`, `check-batch`)
- Secret `SUPER_ADMIN_EMAILS` pour Jennifer
- Droits provision : direction, responsable, super_admin
- RPC **`sync_staff_auth_display_name`** — display name dashboard Supabase
- Migrations : `002`, `003` (backfill), `004` (drop trigger legacy)

### Corrections incidents

| Problème | Cause | Fix |
|----------|-------|-----|
| 403 sur provision | Rôle / email non autorisé | `canProvisionStaffAuth` + `SUPER_ADMIN_EMAILS` |
| Display name vide | RPC non appliquée + REST PUT bug | Migration + `updateUserById` |
| `123456` refusé (Jordan, Jennifer) | Ancien mot de passe Auth | Reset service role + fix edge function |
| `record "new" has no field "username"` | Trigger `on_staff_created` legacy | Migration `004` — DROP trigger + fonction |

### Navigation & session

- Sidebar : nom + rôle connecté (`useCurrentStaffSession`)
- **`utils/adminAccess.ts`** : filtre menu, garde URL, landing par rôle
- Mobile : quick tabs filtrés

---

## Migrations SQL (staff / auth)

| Fichier | Objet |
|---------|--------|
| `20260620_001_staff_role_rename.sql` | Slugs rôles |
| `20260620_002_sync_staff_auth_display_name.sql` | RPC display name |
| `20260620_003_backfill_staff_auth_display_names.sql` | Backfill noms existants |
| `20260620_004_drop_legacy_staff_auth_trigger.sql` | Suppression trigger `username` |

---

## Fichiers touchés (référence)

| Zone | Fichiers |
|------|----------|
| Rôles | `constants/staffRoles.ts` |
| Accès menu | `utils/adminAccess.ts`, `utils/adminRoutes.ts` |
| Auth provision | `services/staffAuthProvisioning.ts`, `supabase/functions/create-staff-auth/` |
| Staff UI | `StaffTab.tsx`, `StaffEditorModal.tsx`, `StaffLogin.tsx` |
| Layout | `Sidebar.tsx`, `BottomNav.tsx`, `AdminMenuSheet.tsx`, `AdminPanel.tsx` |
| Session | `hooks/admin/useCurrentStaffSession.ts`, `hooks/admin/useStaffManager.ts` |

---

## Reste ouvert (voir CHANTIERS.md)

- RLS par rôle en base (P0)
- Tests terrain tous profils
- Titres dupliqués sur certains onglets

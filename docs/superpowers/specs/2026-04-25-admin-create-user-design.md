# Admin Create User — Design Spec

**Date:** 2026-04-25
**Status:** Approved

## Context

The admin Users tab (`src/components/admin/UsersTab.tsx`) supports all user management actions (ban, delete, impersonate, set password, etc.) but has no way to create new users. Admins need this to onboard users directly without requiring them to self-register with an invite code.

## Goals

1. "Create User" button in the UsersTab header that opens a modal form.
2. Admin-created users bypass the invite code requirement.
3. New user appears in the list immediately on success.

---

## UI: `UsersTab.tsx`

### Header row change

Add a "Create User" button to the right of the existing search + user count row:

```
[ 🔍 Search by email… ]    [ Create User ]    42 users
```

The button uses the existing `Button` component with `variant="primary"` and `size="sm"`.

### Create User modal

Triggered by the "Create User" button. Uses the existing `Modal` component with title "Create User".

**Fields:**
- **Name** — text input, required, placeholder "Full name"
- **Email** — email input, required, placeholder "email@example.com"
- **Password** — password input, required, placeholder "Min. 8 characters", `autoComplete="new-password"`
- **Role** — pill toggle: `user` (default) / `admin`, same pill pattern as the ban expiry duration selector already in the file

**Actions:**
- "Create User" primary button — disabled while any required field is empty, password < 8 chars, or request in flight
- Cancel ghost button

**Success:** close modal, reset form, prepend new user to `users` state, increment `total`, show toast "User created successfully".

**Error:** show inline error message inside the modal (same style as the ban/delete modals).

---

## API

Uses the existing Better Auth admin client method already available in the project:

```typescript
authClient.admin.createUser({
  name,
  email,
  password,
  role: role as 'user' | 'admin',
})
```

No new worker endpoints needed — this goes through Better Auth's admin API directly.

---

## Backend: Invite code hook bypass

**File:** `worker/lib/auth.ts`

The `databaseHooks.user.create.before` hook currently throws `'Invite code is required'` if no invite code is present. Admin-created users won't have one.

**Change:** Make the invite code validation conditional — only run if an invite code is present. Self-registration always sends one (enforced by the register form UI and the `inviteCode` field being required there), so removing the hard throw for absence does not weaken that path.

**Before:**
```typescript
const inviteCode = (user as any).invite_code || (user as any).inviteCode
if (!inviteCode) {
  throw new Error('Invite code is required')
}
// ... validate code ...
```

**After:**
```typescript
const inviteCode = (user as any).invite_code || (user as any).inviteCode
if (inviteCode) {
  // validate and consume invite code as before
}
```

The `after` hook (which increments `used_count`) is already guarded by `if (inviteCode)` — no change needed there.

---

## Files to create/modify

| File | Change |
|------|--------|
| `src/components/admin/UsersTab.tsx` | Add "Create User" button, modal, form state, and `handleCreateUser` action |
| `worker/lib/auth.ts` | Make invite code validation conditional (skip if no code present) |

---

## Out of scope

- Email verification for admin-created accounts (Better Auth sends a verification email if email verification is enabled; that's existing behaviour and not changed)
- Sending a welcome/credentials email to the new user — separate feature
- Bulk user creation

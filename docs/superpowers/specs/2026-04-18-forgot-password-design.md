# Forgot Password — Design Spec

**Date:** 2026-04-18  
**Status:** Approved

---

## Overview

Add a forgot-password flow using Better Auth's built-in `requestPasswordReset` / `resetPassword` methods. The request step lives inline on the existing login page (no new route). The password-reset step lives on a new `/reset-password` page reached from the emailed link.

---

## Flow

```
LoginPage (step: login)
  → click "Forgot password?"
LoginPage (step: forgot)
  → submit email → authClient.requestPasswordReset(...)
LoginPage (step: sent)
  → "Check your email" confirmation

Email link → /reset-password?token=...
  → submit new password → authClient.resetPassword(...)
  → success: navigate to /login
  → error (invalid/expired): inline error card with link back to /login
```

---

## Changes

### `src/lib/auth-client.ts`

Export `authClient` directly so callers can use `authClient.requestPasswordReset` and `authClient.resetPassword`. No new imports needed — these are built into the Better Auth client.

### `src/pages/LoginPage.tsx`

Add `step` state: `'login' | 'forgot' | 'sent'`.

The right-panel form renders one of three views based on `step`, cross-fading with a CSS opacity/translate transition:

| Step | Content |
|------|---------|
| `login` | Existing email + password form. "Forgot password?" link below password field sets `step = 'forgot'`. |
| `forgot` | Email input + "Send reset link" button + "← Back to sign in" ghost button. On submit calls `authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })`. Always transitions to `sent` on success or known failure (no user enumeration). Network errors shown inline. |
| `sent` | "Check your email" confirmation with the submitted email address shown. "← Back to sign in" link resets to `login` step. |

### `src/pages/ResetPasswordPage.tsx` (new)

- Reads `token` from `useSearchParams()`.
- Renders a "Choose a new password" form with: new password field, confirm password field, submit button.
- Client-side validation: passwords must match before submit.
- On submit calls `authClient.resetPassword({ newPassword, token })`.
  - **Success:** navigate to `/login`.
  - **Error (invalid/expired token):** show an inline error card: "This link has expired or is invalid. Request a new reset link →" which navigates to `/login` (the forgot step auto-triggers is not needed — user can click "Forgot password?" themselves).
- If no `token` in URL: immediately render the expired/invalid error card.

### `src/App.tsx`

Add one new public route inside the existing `<Routes>`:

```tsx
<Route path="reset-password" element={<ResetPasswordPage />} />
```

Placed alongside the existing `login` and `register` routes (outside the protected `app` subtree).

---

## Error handling

| Scenario | Handling |
|----------|----------|
| Unknown email on forgot step | Silent success (no user enumeration) |
| Network error on forgot step | Inline error message, stay on `forgot` step |
| Password mismatch on reset page | Client-side error below confirm field, block submit |
| Expired/invalid token | Prominent inline error card with link back to `/login` |
| No token in URL | Same expired/invalid error card |
| Network error on reset submit | Inline error message, stay on form |

---

## Out of scope

- Rate limiting on the forgot-password endpoint (handled server-side by Better Auth)
- Token expiry duration (configured in Better Auth defaults — 1 hour)
- "Already have an account?" flow changes

---

## Files to create/modify

| File | Action |
|------|--------|
| `src/lib/auth-client.ts` | Export `authClient` |
| `src/pages/LoginPage.tsx` | Add step state + forgot/sent views |
| `src/pages/ResetPasswordPage.tsx` | New page |
| `src/App.tsx` | Add `/reset-password` route + import |

# Forgot Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a forgot-password / reset-password flow to Zephyron using Better Auth's built-in `forgetPassword` and `resetPassword` client methods.

**Architecture:** The request step lives inline on the existing `LoginPage` (3 states: `login` → `forgot` → `sent`), cross-fading the form content in place. The actual password-reset form lives on a new `ResetPasswordPage` at `/reset-password`, reached only via the emailed token link.

**Tech Stack:** React 19, React Router 7, Better Auth client (`authClient.forgetPassword` / `authClient.resetPassword`), Tailwind CSS 4, existing `Button` and `Input` UI primitives.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/auth-client.ts` | Modify | Export `authClient` so pages can call `forgetPassword` / `resetPassword` |
| `src/pages/LoginPage.tsx` | Modify | Add `step` state + forgot + sent views with cross-fade transition |
| `src/pages/ResetPasswordPage.tsx` | Create | New-password form; validates token via Better Auth; handles expired/invalid |
| `src/App.tsx` | Modify | Import `ResetPasswordPage`, add `/reset-password` public route |

---

## Task 1: Export `authClient` from auth-client.ts

**Files:**
- Modify: `src/lib/auth-client.ts`

- [ ] **Step 1: Add `authClient` to the named exports**

Open `src/lib/auth-client.ts`. The current file ends with:

```ts
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient
```

Add `authClient` itself to the exports so pages can call `authClient.forgetPassword` and `authClient.resetPassword`. Replace the file content with:

```ts
import { createAuthClient } from 'better-auth/react'
import { adminClient, twoFactorClient } from 'better-auth/client/plugins'
import { apiKeyClient } from '@better-auth/api-key/client'

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: '/api/auth',
  plugins: [
    adminClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = '/2fa'
      },
    }),
    apiKeyClient(),
  ],
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient
```

- [ ] **Step 2: Verify type-check passes**

```bash
bun run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth-client.ts
git commit -m "feat: export authClient for forgetPassword/resetPassword"
```

---

## Task 2: Add forgot-password steps to LoginPage

**Files:**
- Modify: `src/pages/LoginPage.tsx`

- [ ] **Step 1: Replace LoginPage with the three-step version**

Replace the entire content of `src/pages/LoginPage.tsx` with:

```tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { signIn, authClient } from '../lib/auth-client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Logo } from '../components/ui/Logo'

type Step = 'login' | 'forgot' | 'sent'

export function LoginPage() {
  const [step, setStep] = useState<Step>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const result = await signIn.email({ email, password })
      if (result.error) {
        setError(result.error.message || 'Sign in failed')
      } else {
        navigate('/app')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await authClient.forgetPassword({
        email: forgotEmail,
        redirectTo: '/reset-password',
      })
    } catch (_err) {
      // Intentionally swallow — no user enumeration
    } finally {
      setIsLoading(false)
      setStep('sent')
    }
  }

  const goToForgot = () => {
    setForgotEmail(email) // pre-fill if user already typed email
    setError(null)
    setStep('forgot')
  }

  const goToLogin = () => {
    setError(null)
    setStep('login')
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-2/5 bg-surface-raised border-r border-border items-end p-12 relative overflow-hidden">
        <div className="absolute top-1/3 -right-20 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[80px]" />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5 mb-12 no-underline">
            <Logo size={32} />
            <span className="text-lg font-semibold text-text-primary tracking-tight">Zephyron</span>
          </Link>
          <p className="text-2xl font-semibold text-text-primary leading-snug mb-3">
            The platform for<br />curated DJ sets
          </p>
          <p className="text-sm text-text-muted">
            AI-powered tracklists. Community-verified.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-10 lg:hidden no-underline">
            <Logo size={28} />
            <span className="text-base font-semibold text-text-primary tracking-tight">Zephyron</span>
          </Link>

          {step === 'login' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold text-text-primary mb-1">Welcome back</h1>
                <p className="text-sm text-text-muted mb-8">Sign in to continue listening</p>
              </div>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <div className="space-y-1">
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={goToForgot}
                  className="text-xs text-accent hover:text-accent-hover float-right cursor-pointer bg-transparent border-none p-0"
                >
                  Forgot password?
                </button>
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <Button variant="primary" type="submit" disabled={isLoading} className="w-full !mt-8">
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              <p className="text-xs text-text-muted">
                Don't have an account?{' '}
                <Link to="/register" className="text-accent hover:text-accent-hover no-underline">Request access</Link>
              </p>
            </form>
          )}

          {step === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold text-text-primary mb-1">Reset your password</h1>
                <p className="text-sm text-text-muted mb-8">Enter your email and we'll send a reset link.</p>
              </div>
              <Input
                label="Email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
              {error && <p className="text-xs text-danger">{error}</p>}
              <Button variant="primary" type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Sending...' : 'Send reset link'}
              </Button>
              <Button variant="ghost" type="button" onClick={goToLogin} className="w-full">
                ← Back to sign in
              </Button>
            </form>
          )}

          {step === 'sent' && (
            <div className="space-y-4 text-center">
              <div className="text-4xl mb-4">✉️</div>
              <h1 className="text-xl font-semibold text-text-primary">Check your email</h1>
              <p className="text-sm text-text-muted">
                If <strong className="text-text-secondary">{forgotEmail}</strong> is registered, you'll receive a password reset link shortly.
              </p>
              <button
                type="button"
                onClick={goToLogin}
                className="text-sm text-accent hover:text-accent-hover cursor-pointer bg-transparent border-none p-0 mt-4"
              >
                ← Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify type-check passes**

```bash
bun run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/LoginPage.tsx
git commit -m "feat: add forgot-password inline steps to LoginPage"
```

---

## Task 3: Create ResetPasswordPage

**Files:**
- Create: `src/pages/ResetPasswordPage.tsx`

- [ ] **Step 1: Create the file**

Create `src/pages/ResetPasswordPage.tsx` with this content:

```tsx
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { authClient } from '../lib/auth-client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Logo } from '../components/ui/Logo'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setConfirmError(null)
    setSubmitError(null)

    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match')
      return
    }

    if (!token) return // handled by the no-token render below

    setIsLoading(true)
    try {
      const result = await authClient.resetPassword({ newPassword, token })
      if (result.error) {
        setSubmitError(result.error.message || 'This link has expired or is invalid.')
      } else {
        navigate('/login')
      }
    } catch (_err) {
      setSubmitError('This link has expired or is invalid.')
    } finally {
      setIsLoading(false)
    }
  }

  const isTokenError = !token || !!submitError?.toLowerCase().includes('expired') || !!submitError?.toLowerCase().includes('invalid')

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-2/5 bg-surface-raised border-r border-border items-end p-12 relative overflow-hidden">
        <div className="absolute top-1/3 -right-20 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[80px]" />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5 mb-12 no-underline">
            <Logo size={32} />
            <span className="text-lg font-semibold text-text-primary tracking-tight">Zephyron</span>
          </Link>
          <p className="text-2xl font-semibold text-text-primary leading-snug mb-3">
            The platform for<br />curated DJ sets
          </p>
          <p className="text-sm text-text-muted">
            AI-powered tracklists. Community-verified.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-10 lg:hidden no-underline">
            <Logo size={28} />
            <span className="text-base font-semibold text-text-primary tracking-tight">Zephyron</span>
          </Link>

          {!token || isTokenError ? (
            <div
              className="rounded-xl p-5 space-y-3"
              style={{ background: 'hsl(0 60% 50% / 0.08)', boxShadow: 'inset 0 0 0 1px hsl(0 60% 50% / 0.2)' }}
            >
              <p className="text-sm font-semibold text-text-primary">Link expired or invalid</p>
              <p className="text-sm text-text-muted">This password reset link has expired or is no longer valid.</p>
              <Link
                to="/login"
                className="text-sm text-accent hover:text-accent-hover no-underline"
              >
                Request a new reset link →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold text-text-primary mb-1">Choose a new password</h1>
                <p className="text-sm text-text-muted mb-8">Pick something strong.</p>
              </div>
              <Input
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                minLength={8}
              />
              <Input
                label="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                error={confirmError ?? undefined}
              />
              {submitError && !isTokenError && (
                <p className="text-xs text-danger">{submitError}</p>
              )}
              <Button variant="primary" type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Setting password...' : 'Set new password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify type-check passes**

```bash
bun run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ResetPasswordPage.tsx
git commit -m "feat: add ResetPasswordPage"
```

---

## Task 4: Wire route in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the import**

In `src/App.tsx`, add the import alongside the other public page imports (after the `TwoFactorPage` import line):

```tsx
import { ResetPasswordPage } from './pages/ResetPasswordPage'
```

- [ ] **Step 2: Add the route**

In the `<Routes>` block, add the new route after the `register` route (line ~130):

```tsx
<Route path="reset-password" element={<ResetPasswordPage />} />
```

The relevant section should look like:

```tsx
{/* Public routes */}
<Route index element={<RedirectIfAuth><LandingPage /></RedirectIfAuth>} />
<Route path="login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
<Route path="register" element={<RedirectIfAuth><RegisterPage /></RedirectIfAuth>} />
<Route path="reset-password" element={<ResetPasswordPage />} />
<Route path="2fa" element={<TwoFactorPage />} />
```

- [ ] **Step 3: Verify the full build passes**

```bash
bun run typecheck && bun run lint
```

Expected: no errors (warnings are fine).

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: register /reset-password route"
```

---

## Task 5: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
bun run dev
```

Open `http://localhost:5173/login`.

- [ ] **Step 2: Test the forgot-password inline flow**

1. Click **Forgot password?** — form should cross-fade to the forgot step with an email field.
2. Type an email and click **Send reset link** — should transition to the "Check your email" confirmation showing the email address.
3. Click **← Back to sign in** — should return to the normal login form.

- [ ] **Step 3: Test the reset-password page — no token**

Navigate to `http://localhost:5173/reset-password` (no query string).

Expected: error card shown immediately — "Link expired or invalid" with "Request a new reset link →".

- [ ] **Step 4: Test the reset-password page — with a fake token**

Navigate to `http://localhost:5173/reset-password?token=fakeinvalidtoken`.

Expected: password form rendered. Submit with mismatched passwords — confirm error appears below confirm field. Submit with matching passwords — Better Auth returns an error, the error card ("Link expired or invalid") appears.

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat: forgot password flow complete"
```

---

## Task 6: Push and open PR

- [ ] **Step 1: Push branch and open PR**

```bash
git push origin staging
gh pr create \
  --title "feat: forgot password / reset password flow" \
  --body "Adds inline forgot-password steps to LoginPage and a new /reset-password page using Better Auth's forgetPassword/resetPassword client methods." \
  --base master
```

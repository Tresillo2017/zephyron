import { createAuthClient } from 'better-auth/react'
import type { BetterAuthClientPlugin } from 'better-auth/client'
import { adminClient, twoFactorClient } from 'better-auth/client/plugins'
import { apiKeyClient, type ApiKeyClientPlugin } from '@better-auth/api-key/client'

type ApiKeyActions = ApiKeyClientPlugin extends { getActions: (...args: any[]) => infer A } ? A : Record<string, (...args: any[]) => Promise<any>>

const _authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: '/api/auth',
  plugins: [
    adminClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = '/2fa'
      },
    }),
    apiKeyClient() as unknown as BetterAuthClientPlugin,
  ],
})

export const authClient = _authClient as typeof _authClient & { apiKey: ApiKeyActions }

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient

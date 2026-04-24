import { createAuthClient } from 'better-auth/react'
import type { BetterAuthClientPlugin } from 'better-auth/client'
import { adminClient, twoFactorClient, deviceAuthorizationClient } from 'better-auth/client/plugins'
import { apiKeyClient, type ApiKeyClientPlugin } from '@better-auth/api-key/client'

type ApiKeyActions = ApiKeyClientPlugin extends { getActions: (...args: any[]) => infer A } ? A : Record<string, (...args: any[]) => Promise<any>>

type DeviceActions = {
  device: {
    approve: (data: { userCode: string }) => Promise<void>
    deny: (data: { userCode: string }) => Promise<void>
  }
}

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
    deviceAuthorizationClient(),
  ],
})

export const authClient = _authClient as typeof _authClient & { apiKey: ApiKeyActions } & DeviceActions

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient

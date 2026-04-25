// Better Auth server configuration for Cloudflare Workers + D1
// Instantiated per-request because env.DB is only available in fetch()

import { betterAuth } from 'better-auth'
import { admin, twoFactor, deviceAuthorization } from 'better-auth/plugins'
import { apiKey } from '@better-auth/api-key'
import { D1Dialect } from 'kysely-d1'
import { Kysely } from 'kysely'
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailChangeEmail,
} from './email'

/**
 * Create a Better Auth instance configured for the current request's env.
 * In Cloudflare Workers, bindings are only available inside fetch(),
 * so we must create a new instance per request.
 */
export function createAuth(env: Env) {
  const db = new Kysely<any>({
    dialect: new D1Dialect({ database: env.DB as any }),
  })

  return betterAuth({
    appName: 'Zephyron',
    database: {
      db,
      type: 'sqlite',
    },
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL || 'http://localhost:5173',
    trustedOrigins: [
      'http://localhost:5173',
      'http://localhost:4173',
      // Android TV app requests always carry Origin: https://zephyron.app via OkHttp interceptor.
      env.BETTER_AUTH_URL || '',
    ].filter(Boolean),
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        await sendPasswordResetEmail(env, user.email, user.name, url)
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationEmail(env, user.email, user.name, url)
      },
    },
    user: {
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ user, newEmail, url }: { user: { name: string; email: string }; newEmail: string; url: string }) => {
          await sendEmailChangeEmail(env, newEmail, user.name, url)
        },
      },
      additionalFields: {
        reputation: {
          type: 'number',
          required: false,
          defaultValue: 0,
          input: false,
        },
        totalAnnotations: {
          type: 'number',
          required: false,
          defaultValue: 0,
          input: false,
          fieldName: 'total_annotations',
        },
        totalVotes: {
          type: 'number',
          required: false,
          defaultValue: 0,
          input: false,
          fieldName: 'total_votes',
        },
        inviteCode: {
          type: 'string',
          required: false,
          input: true,
          fieldName: 'invite_code',
        },
        avatar_url: {
          type: 'string',
          required: false,
          input: false,
        },
        banner_url: {
          type: 'string',
          required: false,
          input: false,
        },
        bio: {
          type: 'string',
          required: false,
          input: false,
        },
        is_profile_public: {
          type: 'boolean',
          required: false,
          defaultValue: false,
          input: false,
        },
        show_activity: {
          type: 'boolean',
          required: false,
          defaultValue: true,
          input: false,
        },
        show_liked_songs: {
          type: 'boolean',
          required: false,
          defaultValue: true,
          input: false,
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24,       // 1 day
    },
    plugins: [
      admin(),
      twoFactor({
        issuer: 'Zephyron',
        totpOptions: {
          digits: 6,
          period: 30,
        },
        backupCodeOptions: {
          amount: 10,
          length: 10,
        },
      }),
      apiKey({
        defaultPrefix: 'zeph_',
        enableSessionForAPIKeys: true,
        // Defer counter updates to ctx.waitUntil on CF Workers
        deferUpdates: true,
        // Disable rate limiting — admin API keys are trusted
        rateLimit: {
          enabled: false,
        },
      }) as any,
      deviceAuthorization({
        verificationUri: '/device',
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            // Validate invite code during registration
            // Admin-created users pass data.skip_invite_check to bypass this requirement.
            // Self-registration must always supply an invite code.
            const skipInviteCheck = (user as any).skip_invite_check === true
            const inviteCode = (user as any).invite_code || (user as any).inviteCode

            if (!skipInviteCheck) {
              if (!inviteCode) {
                throw new Error('Invite code is required')
              }

              // Check invite code validity (do NOT consume yet — wait for successful creation)
              const code = await env.DB.prepare(
                'SELECT id, max_uses, used_count, expires_at FROM invite_codes WHERE code = ?'
              )
                .bind(inviteCode)
                .first<{ id: string; max_uses: number; used_count: number; expires_at: string | null }>()

              if (!code) {
                throw new Error('Invalid invite code')
              }

              if (code.max_uses > 0 && code.used_count >= code.max_uses) {
                throw new Error('Invite code has been fully used')
              }

              if (code.expires_at && new Date(code.expires_at) < new Date()) {
                throw new Error('Invite code has expired')
              }
            }

            return {
              data: {
                ...user,
                reputation: 0,
                total_annotations: 0,
                total_votes: 0,
              },
            }
          },
          after: async (user) => {
            const inviteCode = (user as any).invite_code || (user as any).inviteCode
            if (inviteCode) {
              await env.DB.prepare(
                'UPDATE invite_codes SET used_count = used_count + 1 WHERE code = ?'
              )
                .bind(inviteCode)
                .run()
            }
            // Send welcome email and await it so the Worker tracks the async work.
            try {
              await sendWelcomeEmail(env, user.email, user.name)
            } catch (err) {
              console.error('[email] Welcome email failed:', err)
            }
          },
        },
      },
    },
    advanced: {
      crossSubDomainCookies: {
        enabled: false,
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>

/**
 * Validate that the request has an active admin session.
 * Returns the user object if valid, or a 401/403 Response if not.
 */
export async function requireAdmin(
  request: Request,
  env: Env
): Promise<{ user: { id: string; role: string; name: string; email: string } } | Response> {
  // Allow extension/headless admin access via static API key
  const apiKey = request.headers.get('X-Admin-API-Key')
  if (apiKey) {
    const validKey = (env as any).ADMIN_API_KEY as string | undefined
    if (!validKey) {
      return new Response(JSON.stringify({ error: 'ADMIN_API_KEY not configured', ok: false }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
    // Use timing-safe comparison to prevent key enumeration via response time
    const encoder = new TextEncoder()
    const [incomingBuf, validBuf] = await Promise.all([
      crypto.subtle.digest('SHA-256', encoder.encode(apiKey)),
      crypto.subtle.digest('SHA-256', encoder.encode(validKey)),
    ])
    const incoming = new Uint8Array(incomingBuf)
    const valid = new Uint8Array(validBuf)
    let match = incoming.length === valid.length
    for (let i = 0; i < incoming.length; i++) {
      match = match && (incoming[i] === valid[i])
    }
    if (!match) {
      return new Response(JSON.stringify({ error: 'Invalid API key', ok: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
    return { user: { id: 'api-key', role: 'admin', name: 'API Key', email: '' } }
  }

  try {
    const auth = createAuth(env)
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Authentication required', ok: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    if (session.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required', ok: false }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    return { user: session.user as any }
  } catch (err) {
    console.error('[auth] Admin check failed:', err)
    return new Response(JSON.stringify({ error: 'Authentication failed', ok: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}

/**
 * Validate that the request has an active session (any role).
 * Returns the user object if valid, or a 401 Response if not.
 */
export async function requireAuth(
  request: Request,
  env: Env
): Promise<{ user: { id: string; role: string; name: string; email: string } } | Response> {
  try {
    const auth = createAuth(env)
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Authentication required', ok: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    return { user: session.user as any }
  } catch (err) {
    console.error('[auth] Auth check failed:', err)
    return new Response(JSON.stringify({ error: 'Authentication failed', ok: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}

/**
 * Get authenticated user if present, or null if not authenticated.
 * Does not return an error response - use for optional authentication.
 */
export async function getOptionalAuth(
  request: Request,
  env: Env
): Promise<{ id: string; role: string; name: string; email: string } | null> {
  try {
    const auth = createAuth(env)
    const session = await auth.api.getSession({ headers: request.headers })
    return session?.user ? (session.user as any) : null
  } catch (err) {
    return null
  }
}

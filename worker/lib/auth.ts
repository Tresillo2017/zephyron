// Better Auth server configuration for Cloudflare Workers + D1
// Instantiated per-request because env.DB is only available in fetch()

import { betterAuth } from 'better-auth'
import { admin, twoFactor } from 'better-auth/plugins'
import { D1Dialect } from 'kysely-d1'
import { Kysely } from 'kysely'

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
    emailAndPassword: {
      enabled: true,
      // Password change is enabled by default via changePassword endpoint
    },
    user: {
      changeEmail: {
        enabled: true,
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
    ],
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            // Validate invite code during registration
            const inviteCode = (user as any).invite_code || (user as any).inviteCode
            if (!inviteCode) {
              throw new Error('Invite code is required')
            }

            // Check invite code validity
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

            // Consume the invite code
            await env.DB.prepare(
              'UPDATE invite_codes SET used_count = used_count + 1 WHERE id = ?'
            )
              .bind(code.id)
              .run()

            return {
              data: {
                ...user,
                reputation: 0,
                total_annotations: 0,
                total_votes: 0,
              },
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

// Better Auth server configuration for Cloudflare Workers + D1
// Instantiated per-request because env.DB is only available in fetch()

import { betterAuth } from 'better-auth'
import { admin } from 'better-auth/plugins'
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
    database: {
      db,
      type: 'sqlite',
    },
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET || 'zephyron-dev-secret-change-in-production-32chars!!',
    baseURL: env.BETTER_AUTH_URL || 'http://localhost:5173',
    emailAndPassword: {
      enabled: true,
    },
    user: {
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

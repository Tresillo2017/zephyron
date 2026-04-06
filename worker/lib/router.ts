// Minimal URL pattern router for Cloudflare Workers
// No external dependencies needed

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS'

type RouteHandler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
) => Promise<Response> | Response

interface Route {
  method: HttpMethod
  pattern: RegExp
  paramNames: string[]
  handler: RouteHandler
}

export class Router {
  private routes: Route[] = []

  private addRoute(method: HttpMethod, path: string, handler: RouteHandler) {
    const paramNames: string[] = []
    const pattern = path
      .replace(/:([^/]+)/g, (_, name) => {
        paramNames.push(name)
        return '([^/]+)'
      })
      .replace(/\//g, '\\/')

    this.routes.push({
      method,
      pattern: new RegExp(`^${pattern}$`),
      paramNames,
      handler,
    })
  }

  get(path: string, handler: RouteHandler) {
    this.addRoute('GET', path, handler)
    return this
  }

  post(path: string, handler: RouteHandler) {
    this.addRoute('POST', path, handler)
    return this
  }

  put(path: string, handler: RouteHandler) {
    this.addRoute('PUT', path, handler)
    return this
  }

  delete(path: string, handler: RouteHandler) {
    this.addRoute('DELETE', path, handler)
    return this
  }

  patch(path: string, handler: RouteHandler) {
    this.addRoute('PATCH', path, handler)
    return this
  }

  async handle(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response | null> {
    const url = new URL(request.url)
    const method = request.method as HttpMethod
    const pathname = url.pathname

    for (const route of this.routes) {
      if (route.method !== method) continue
      const match = pathname.match(route.pattern)
      if (!match) continue

      const params: Record<string, string> = {}
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1]
      })

      return route.handler(request, env, ctx, params)
    }

    return null
  }
}

// CORS headers helper — validates origin against allowed list
export function corsHeaders(requestOrigin?: string | null): Headers {
  const headers = new Headers()

  // Allowed origins for CORS
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
  ]

  // Check if origin matches allowed patterns
  const isAllowed = requestOrigin && (
    allowedOrigins.includes(requestOrigin) ||
    // Allow production domain and subdomains
    requestOrigin.endsWith('.zephyron.app') ||
    requestOrigin === 'https://zephyron.app' ||
    // Allow Cloudflare Workers preview URLs (only for development)
    (requestOrigin.endsWith('.workers.dev') && requestOrigin.includes('zephyron'))
  )

  const origin = isAllowed ? requestOrigin : allowedOrigins[0]

  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Anonymous-Id, Authorization, Range, x-api-key')
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges')
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set('Access-Control-Max-Age', '86400')
  return headers
}

// JSON response helper
export function json<T>(data: T, status = 200, requestOrigin?: string | null): Response {
  return Response.json(data, {
    status,
    headers: corsHeaders(requestOrigin),
  })
}

// Error response helper
export function errorResponse(message: string, status = 400): Response {
  return json({ error: message, ok: false }, status)
}

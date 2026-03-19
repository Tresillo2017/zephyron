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

// CORS headers helper
export function corsHeaders(origin = '*'): Headers {
  const headers = new Headers()
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Anonymous-Id, Authorization, Range')
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges')
  headers.set('Access-Control-Max-Age', '86400')
  return headers
}

// JSON response helper
export function json<T>(data: T, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Anonymous-Id',
    },
  })
}

// Error response helper
export function errorResponse(message: string, status = 400): Response {
  return json({ error: message, ok: false }, status)
}

// Vercel Edge Middleware for security, origin validation, and geolocation enrichment

export const config = {
  matcher: ['/api/:path*']
};

/**
 * Checks if the request origin or referer matches the host
 */
function isAllowedOrigin(request) {
  const host = request.headers.get('host');
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const secFetchSite = request.headers.get('sec-fetch-site');

  // Block explicit cross-site fetch/XHR requests from third-party websites
  if (secFetchSite === 'cross-site') {
    return false;
  }

  // If origin header is present, ensure it matches the current host
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return false;
      }
    } catch {
      return false;
    }
  }

  // If referer header is present, ensure it matches the current host
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

export default function middleware(request) {
  const url = new URL(request.url);

  // Enforce origin restrictions on API calls
  if (url.pathname.startsWith('/api/')) {
    // Handle CORS preflight if ever called
    if (request.method === 'OPTIONS') {
      const host = request.headers.get('host') || '';
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': `https://${host}`,
          'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // Only allow GET/HEAD for Flavor of the Day APIs
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Restrict to same-site callers
    if (!isAllowedOrigin(request)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: API access is restricted to this application.' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff'
          }
        }
      );
    }
  }

  // Continue to the function
  return;
}

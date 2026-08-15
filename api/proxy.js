// Secure Vercel Edge Proxy endpoint (backward compatible, strictly locked down)

export const config = {
  runtime: 'edge'
};

import fotdHandler from './fotd.js';

export default async function handler(request) {
  const url = new URL(request.url);
  const targetUrlStr = url.searchParams.get('url');

  // If no target URL given, try to handle as fotd request with direct params
  if (!targetUrlStr) {
    return fotdHandler(request);
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrlStr);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid URL parameter' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' }
      }
    );
  }

  // Strict SSRF protection: only allow official Culver's locator endpoint
  if (
    parsedTarget.hostname !== 'www.culvers.com' ||
    !parsedTarget.pathname.startsWith('/api/locator/getLocations')
  ) {
    return new Response(
      JSON.stringify({
        error: 'Forbidden: Proxying is restricted exclusively to Culver\'s location API.'
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' }
      }
    );
  }

  // Rewrite request using the validated target URL search parameters
  const forwardedUrl = new URL(request.url);
  for (const [key, value] of parsedTarget.searchParams.entries()) {
    forwardedUrl.searchParams.set(key, value);
  }

  const forwardedRequest = new Request(forwardedUrl.toString(), {
    method: request.method,
    headers: request.headers
  });

  return fotdHandler(forwardedRequest);
}

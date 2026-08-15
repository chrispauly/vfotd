// Vercel Edge Function for querying Culver's Flavor of the Day

export const config = {
  runtime: 'edge'
};

const CULVERS_API_BASE = 'https://www.culvers.com/api/locator/getLocations';

export default async function handler(request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Extract latitude and longitude from query params or fallback to Vercel Edge IP-Geo headers
  let latStr = searchParams.get('lat') || request.headers.get('x-vercel-ip-latitude');
  let lonStr = searchParams.get('long') || searchParams.get('lon') || request.headers.get('x-vercel-ip-longitude');
  const city = request.headers.get('x-vercel-ip-city') || '';
  const region = request.headers.get('x-vercel-ip-country-region') || '';

  if (!latStr || !lonStr) {
    return new Response(
      JSON.stringify({
        error: 'Missing coordinates',
        message: 'Please provide valid lat and lon query parameters, or enable location services.'
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    );
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  // Validate coordinate ranges
  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return new Response(
      JSON.stringify({ error: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    );
  }

  // Parse radius and limit with safe boundaries
  let radius = parseInt(searchParams.get('radius') || '40233', 10);
  if (isNaN(radius) || radius <= 0 || radius > 200000) {
    radius = 40233; // ~25 miles
  }

  let limit = parseInt(searchParams.get('limit') || '10', 10);
  if (isNaN(limit) || limit <= 0 || limit > 30) {
    limit = 10;
  }

  const upstreamUrl = `${CULVERS_API_BASE}?lat=${lat}&long=${lon}&radius=${radius}&limit=${limit}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7500);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!upstreamResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream service returned status ${upstreamResponse.status}` }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff'
          }
        }
      );
    }

    const data = await upstreamResponse.json();

    // Edge cache response for 30 minutes, allow stale-while-revalidate for 24 hours
    const responseHeaders = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
      'X-Edge-Cache': 'HIT-ELIGIBLE'
    });

    if (city) {
      responseHeaders.set('X-Edge-City', decodeURIComponent(city));
    }
    if (region) {
      responseHeaders.set('X-Edge-Region', decodeURIComponent(region));
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: responseHeaders
    });
  } catch (error) {
    clearTimeout(timeoutId);
    const isTimeout = error.name === 'AbortError';
    return new Response(
      JSON.stringify({
        error: isTimeout ? 'Upstream request timed out' : 'Failed to reach Culver\'s locator service',
        detail: error.message
      }),
      {
        status: isTimeout ? 504 : 502,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    );
  }
}

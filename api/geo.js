// Vercel Edge Function for returning Vercel IP-Geo location

export const config = {
  runtime: 'edge'
};

export default async function handler(request) {
  const city = request.headers.get('x-vercel-ip-city') || '';
  const region = request.headers.get('x-vercel-ip-country-region') || '';
  const country = request.headers.get('x-vercel-ip-country') || '';
  const latitude = request.headers.get('x-vercel-ip-latitude') || '';
  const longitude = request.headers.get('x-vercel-ip-longitude') || '';

  return new Response(
    JSON.stringify({
      city: city ? decodeURIComponent(city) : null,
      region: region ? decodeURIComponent(region) : null,
      country,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      hasGeo: Boolean(latitude && longitude)
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    }
  );
}

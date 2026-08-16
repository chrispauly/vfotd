// Vercel Edge Function for retrieving upcoming 4-day flavor calendar for a Culver's location

export const config = {
  runtime: 'edge'
};

const CULVERS_RESTAURANT_BASE = 'https://www.culvers.com/restaurants/';

export default async function handler(request) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') || '').trim();

  // Validate slug to prevent SSRF and injection
  if (!slug || !/^[a-z0-9-]+$/i.test(slug) || slug.length > 80) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing restaurant slug parameter' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' }
      }
    );
  }

  const targetUrl = `${CULVERS_RESTAURANT_BASE}${encodeURIComponent(slug)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7500);

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!upstreamResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Restaurant page returned status ${upstreamResponse.status}`, upcoming: [] }),
        {
          status: upstreamResponse.status === 404 ? 404 : 502,
          headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' }
        }
      );
    }

    const html = await upstreamResponse.text();
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);

    let upcoming = [];

    if (nextDataMatch) {
      try {
        const json = JSON.parse(nextDataMatch[1]);
        const allFlavors = json.props?.pageProps?.page?.customData?.restaurantCalendar?.flavors || [];

        // Support client's local date param if provided, otherwise compute in Central Time
        const dateParam = (url.searchParams.get('date') || '').trim();
        const isValidDateParam = /^\d{4}-\d{2}-\d{2}$/.test(dateParam);

        const todayStr = isValidDateParam
          ? dateParam
          : new Intl.DateTimeFormat('en-CA', {
              timeZone: 'America/Chicago',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).format(new Date());

        upcoming = allFlavors
          .filter(f => f.onDate && f.onDate.split('T')[0] > todayStr)
          .sort((a, b) => a.onDate.localeCompare(b.onDate))
          .slice(0, 4)
          .map(f => {
            const rawDate = f.onDate.split('T')[0];
            const [year, month, day] = rawDate.split('-').map(Number);
            // Instantiate at noon (12:00) to avoid any edge timezone day shifts
            const d = new Date(year, month - 1, day, 12, 0, 0);
            return {
              date: rawDate,
              dayName: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Chicago' }),
              dateFormatted: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', timeZone: 'America/Chicago' }),
              title: f.title || f.name || 'Flavor of the Day',
              slug: f.urlSlug || '',
              image: f.image?.src || f.image?.imagePath || null
            };
          });
      } catch (parseErr) {
        console.warn('Failed to parse __NEXT_DATA__ JSON:', parseErr);
      }
    }

    return new Response(
      JSON.stringify({ slug, upcoming }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    );
  } catch (error) {
    clearTimeout(timeoutId);
    return new Response(
      JSON.stringify({
        error: error.name === 'AbortError' ? 'Request timed out' : 'Failed to fetch calendar',
        upcoming: []
      }),
      {
        status: error.name === 'AbortError' ? 504 : 502,
        headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' }
      }
    );
  }
}

// Automated test suite for vfotd Edge API, security hardening, and SSRF prevention
import assert from 'node:assert';
import middleware from '../middleware.js';
import fotdHandler from '../api/fotd.js';
import geoHandler from '../api/geo.js';
import proxyHandler from '../api/proxy.js';

console.log('🧪 Starting vfotd Edge Security & API Tests...\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`, err);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`, err);
    }
  }

  // --- 1. Middleware Security Tests ---
  console.log('--- 1. Middleware Origin & Method Security ---');

  test('Blocks cross-site fetch requests', () => {
    const req = new Request('http://localhost:3000/api/fotd', {
      headers: {
        'host': 'localhost:3000',
        'sec-fetch-site': 'cross-site'
      }
    });
    const res = middleware(req);
    assert.strictEqual(res.status, 403, 'Should return 403 for cross-site requests');
  });

  test('Blocks mismatching origin header (CORS attack prevention)', () => {
    const req = new Request('http://localhost:3000/api/fotd', {
      headers: {
        'host': 'localhost:3000',
        'origin': 'https://evil-attacker-site.com'
      }
    });
    const res = middleware(req);
    assert.strictEqual(res.status, 403, 'Should return 403 for mismatched origin');
  });

  test('Allows same-origin requests', () => {
    const req = new Request('http://localhost:3000/api/fotd', {
      headers: {
        'host': 'localhost:3000',
        'origin': 'http://localhost:3000',
        'sec-fetch-site': 'same-origin'
      }
    });
    const res = middleware(req);
    assert.strictEqual(res, undefined, 'Should pass through middleware (undefined)');
  });

  test('Rejects unsupported HTTP methods (e.g. POST, DELETE)', () => {
    const req = new Request('http://localhost:3000/api/fotd', {
      method: 'POST',
      headers: { 'host': 'localhost:3000' }
    });
    const res = middleware(req);
    assert.strictEqual(res.status, 405, 'Should return 405 Method Not Allowed');
  });

  // --- 2. Input Validation Tests ---
  console.log('\n--- 2. Input Validation & Coordinate Sanitization ---');

  await testAsync('Rejects out-of-bounds coordinates (latitude > 90)', async () => {
    const req = new Request('http://localhost:3000/api/fotd?lat=999.0&lon=-89.4');
    const res = await fotdHandler(req);
    assert.strictEqual(res.status, 400, 'Should reject lat > 90 with 400');
  });

  await testAsync('Rejects invalid coordinate strings (non-numeric)', async () => {
    const req = new Request('http://localhost:3000/api/fotd?lat=DROP_TABLE&lon=abc');
    const res = await fotdHandler(req);
    assert.strictEqual(res.status, 400, 'Should reject invalid coordinates with 400');
  });

  await testAsync('Rejects missing coordinates when headers are absent', async () => {
    const req = new Request('http://localhost:3000/api/fotd');
    const res = await fotdHandler(req);
    assert.strictEqual(res.status, 400, 'Should return 400 when no coordinates are supplied');
  });

  // --- 3. SSRF Prevention Tests ---
  console.log('\n--- 3. SSRF & Open Proxy Prevention ---');

  await testAsync('Blocks proxying to unauthorized external domains', async () => {
    const req = new Request('http://localhost:3000/api/proxy?url=https://internal-metadata-service.local/secret');
    const res = await proxyHandler(req);
    assert.strictEqual(res.status, 403, 'Should block non-Culver targets with 403');
  });

  await testAsync('Blocks proxying to unauthorized paths on Culver domain', async () => {
    const req = new Request('http://localhost:3000/api/proxy?url=https://www.culvers.com/admin/login');
    const res = await proxyHandler(req);
    assert.strictEqual(res.status, 403, 'Should block non-locator paths with 403');
  });

  // --- 4. Live API & Edge Caching Tests ---
  console.log('\n--- 4. Live Culver Locator Query & Edge Caching ---');

  await testAsync('Fetches live Flavor of the Day data for valid coordinates (Madison, WI)', async () => {
    const req = new Request('http://localhost:3000/api/fotd?lat=43.0731&lon=-89.4012&limit=5');
    const res = await fotdHandler(req);
    assert.strictEqual(res.status, 200, 'Should return status 200');

    // Check edge cache headers
    const cacheControl = res.headers.get('cache-control');
    assert.ok(cacheControl && cacheControl.includes('s-maxage=1800'), 'Should contain Edge Cache-Control headers');

    const data = await res.json();
    assert.ok(data?.data?.geofences?.length > 0, 'Should return geofences list');

    const firstLoc = data.data.geofences[0];
    console.log(`      Sample location found: ${firstLoc.description} -> Flavor: ${firstLoc.metadata.flavorOfDayName}`);
    assert.ok(firstLoc.metadata.flavorOfDayName, 'Should have flavor of the day name');
  });

  await testAsync('Returns edge geo fallback correctly', async () => {
    const req = new Request('http://localhost:3000/api/geo', {
      headers: {
        'x-vercel-ip-city': 'Madison',
        'x-vercel-ip-country-region': 'WI',
        'x-vercel-ip-country': 'US',
        'x-vercel-ip-latitude': '43.0731',
        'x-vercel-ip-longitude': '-89.4012'
      }
    });
    const res = await geoHandler(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.city, 'Madison');
    assert.strictEqual(data.latitude, 43.0731);
    assert.strictEqual(data.hasGeo, true);
  });

  console.log(`\n========================================`);
  console.log(`Tests finished: ${passed}/${total} passed`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

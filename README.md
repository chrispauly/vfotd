# 🍦 vfotd (Flavor of the Day)

A lightning-fast, ultra-lightweight web application that tracks your nearest Culver's Flavor of the Day and the upcoming 4-day flavor calendar in real-time, built specifically for **Vercel Edge Functions & Middleware**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

## ⚡ Key Features

- **🚀 Sub-15ms Edge Response**:
  - Culver's location and daily flavor queries are cached on Vercel's global edge network (`s-maxage=1800, stale-while-revalidate=86400`).
  - Restaurant monthly calendar data is edge-cached (`s-maxage=3600, stale-while-revalidate=86400`).
- **📅 4-Day Upcoming Flavor Calendar**:
  - Desktop view displays an inline **Next 4 Days** horizontal strip for each location with custom flavor thumbnails and date badges.
  - Client-side and server-side timezone normalization ensures correct day order regardless of UTC server rollbacks.
- **📍 Instant Hydration & Mobile GPS**:
  - Instant paint using `localStorage` cached coordinates and Vercel IP-Geo headers (`x-vercel-ip-latitude`, `x-vercel-ip-longitude`, `x-vercel-ip-city`).
  - Automatic background high-accuracy GPS refinement (`enableHighAccuracy: true`) on page load.
  - Real-time location refresh when switching tabs or unlocking phone (`visibilitychange`, `pageshow`).
  - Sensitive distance threshold (~300m) to immediately re-sort restaurants when driving between nearby areas (e.g. Madison $\rightarrow$ Fitchburg).
- **🌙 High-Contrast Dark & Light Mode**:
  - Full support for `prefers-color-scheme: dark` with high-contrast buttons, badges, and dark shimmer skeletons.
- **🕒 Accurate Store Hours**:
  - Full support for standard hours, closing at midnight (`12:00 AM`), and post-midnight closing shifts (e.g. `1:00 AM - 3:00 AM`).
- **🛡️ Edge Security & Locked-Down Proxy**:
  - **No Open SSRF**: Strict parameter and destination validation restricts queries exclusively to Culver's API.
  - **Site-Restricted Access**: Edge middleware blocks cross-site API abuse (`Sec-Fetch-Site: cross-site`, mismatched `Origin`/`Referer`).
  - **Input Sanitization**: Numerical coordinate range validation (`-90..90`, `-180..180`) and restaurant slug format checks.
  - **Content Security Policy (CSP)** & strict HTTP security headers configured in `vercel.json`.

---

## 📂 Project Structure

```
├── api/
│   ├── calendar.js    # Vercel Edge Function for upcoming 4-day flavor calendar
│   ├── fotd.js        # Vercel Edge Function for Culver's Locator API (with caching)
│   ├── geo.js         # Vercel Edge Function returning IP-Geo headers
│   └── proxy.js       # Hardened backward-compatible proxy endpoint
├── public/
│   ├── index.html     # Optimized frontend with vanilla CSS & JS
│   ├── ice-cream.svg  # Vector fallback for flavor graphics
│   ├── site.webmanifest
│   └── *.png, *.ico   # App icons & favicon assets
├── test/
│   └── test-api.js    # Automated security, input validation & live API tests
├── middleware.js      # Edge Middleware (origin restriction, method check)
├── vercel.json        # Vercel config, CSP, security headers, and asset caching
├── server.js          # Zero-dependency local development simulator
└── package.json
```

---

## 🛠️ Local Development & Testing

Run the zero-dependency local simulation server (runs Edge functions locally):

```bash
# Start local dev server at http://localhost:3000
npm start
# or
npm run dev
```

Run the automated test suite (14 automated tests):

```bash
npm test
```

---

## 🚀 Deploying to Vercel

1. Push this repository to GitHub as `vfotd`:
   ```bash
   git push origin main
   ```
2. Import the `vfotd` repository in the [Vercel Dashboard](https://vercel.com/new).
3. Compatible with **Vercel Free (Hobby)** and Pro plans with zero environment variables or configuration required.

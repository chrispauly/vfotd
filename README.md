# 🍦 vfotd (Culver's Flavor of the Day)

A high-performance, ultra-lightweight web application that tracks your nearest Culver's Flavor of the Day in real-time, built specifically for **Vercel Edge Functions & Middleware**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

## ⚡ Features & Performance

- **🚀 Sub-15ms Edge Response**: Culver's location and flavor queries are cached on Vercel's global edge network (`s-maxage=1800, stale-while-revalidate=86400`).
- **📍 Instant Hydration (Vercel IP-Geo + LocalStorage)**: Automatically detects your general location from Vercel's edge headers for zero-delay initial rendering, followed by background high-accuracy GPS refinement.
- **🛡️ Locked-Down Proxy & Security Hardening**:
  - **No Open SSRF**: Strict whitelist ensures only official Culver's locator endpoints can be queried.
  - **Site-Restricted Access**: Edge middleware blocks cross-site API abuse (`Sec-Fetch-Site: cross-site`, mismatched `Origin`/`Referer`).
  - **Input Sanitization**: Numerical coordinate range validation (`-90..90`, `-180..180`).
  - **Content Security Policy (CSP)** & strict HTTP security headers configured in `vercel.json`.
- **✨ Modern UI & Aesthetics**:
  - Zero framework runtime overhead (< 25 KB total assets).
  - Responsive cards with Culver's blue accents, glassmorphism, and dark/light mode support.
  - Real-time opening/closing status calculation.
  - One-click Google Maps directions and Flavor Calendar links.
  - Automatic scheduled 6:00 AM reload when daily flavors rotate.

---

## 📂 Project Structure

```
├── api/
│   ├── fotd.js        # Vercel Edge Function for Culver's Locator API (with caching)
│   ├── geo.js         # Vercel Edge Function returning IP-Geo headers
│   └── proxy.js       # Hardened backward-compatible proxy endpoint
├── public/
│   ├── index.html     # Optimized frontend with vanilla CSS & JS
│   ├── site.webmanifest
│   └── *.png, *.ico   # App icons & static branding assets
├── test/
│   └── test-api.js    # Automated security, input validation & live API tests
├── middleware.js      # Edge Middleware (origin restriction, method check)
├── vercel.json        # Vercel config, CSP, security headers, and asset caching
├── server.js          # Zero-dependency local development simulator
└── package.json
```

---

## 🛠️ Local Development

Run the zero-dependency local simulation server:

```bash
# Start local dev server at http://localhost:3000
npm start
# or
npm run dev
```

Run the automated security and API test suite:

```bash
npm test
```

---

## 🚀 Deploying to Vercel

1. Push this repository to GitHub as `vfotd`:
   ```bash
   git remote set-url origin https://github.com/chrispauly/vfotd.git
   git branch -M main
   git push -u origin main
   ```
2. Import the `vfotd` repository in the [Vercel Dashboard](https://vercel.com/new).
3. Vercel will automatically detect the Edge Functions, Middleware, and static assets with zero additional configuration required!

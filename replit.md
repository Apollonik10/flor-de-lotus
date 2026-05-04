# Flor de Lótus — Cardápio Digital (PWA)

## Overview
A mobile-first Progressive Web App (PWA) digital menu for Flor de Lótus, a Japanese/Oriental cuisine restaurant in Cajazeiras, PB, Brazil.

## Tech Stack
- **Frontend:** Vanilla HTML + CSS + JavaScript (ES modules)
- **No build system** — plain static files served via a Node.js HTTP server
- **PWA:** Service Worker + Web App Manifest (offline support, installable)
- **External CDN libs:** Google Fonts, Font Awesome, Splide CSS

## Project Structure
```
/
├── index.html              # Landing/marketing page (redirects to PWA if returning user)
├── server.js               # Node.js static file server (port 5000)
├── pwa/
│   ├── index.html          # Main PWA app shell
│   ├── register.html       # User registration page
│   ├── app.js              # App bootstrap (imports all modules)
│   ├── styles.css          # Main stylesheet
│   ├── menu.json           # Menu data
│   ├── manifest.json       # PWA manifest
│   ├── service-worker.js   # Service worker (caching strategies)
│   ├── js/                 # ES module components
│   │   ├── api.js, state.js, render.js, events.js
│   │   ├── cart.js, favorites.js, loyalty.js, profile.js
│   │   ├── modal.js, toast.js, utils.js, sw.js, install.js
│   └── icons/              # PWA icons (192, 512, maskable, favicon)
├── page-lotus/
│   └── assets/images/      # Food/product images
```

## URL Structure
All content is served under the `/flor-de-lotus/` base path:
- Landing page: `/flor-de-lotus/index.html`
- PWA app: `/flor-de-lotus/pwa/index.html`
- Root `/` redirects to `/flor-de-lotus/index.html`

## Features
- Digital menu catalog with category filtering
- Shopping cart
- Favorites
- User profile drawer
- Loyalty points system
- Offline support via PWA service worker
- WhatsApp ordering integration

## Running
- Workflow: `node server.js` on port 5000
- Server binds to `0.0.0.0:5000`

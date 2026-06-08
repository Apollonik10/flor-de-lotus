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
├── index.html              # Landing/marketing page
├── server.js               # Node.js static file server
├── service-worker.js       # Root Service worker
├── apps/
│   ├── cardapio/           # Main PWA app shell
│   │   ├── index.html
│   │   ├── register.html
│   │   ├── app.js
│   │   ├── styles.css
│   │   ├── manifest.json
│   │   ├── js/             # ES module components
│   │   └── icons/          # PWA icons
│   └── admin/              # Admin dashboard
├── public/
│   ├── assets/images/      # Food/product images
│   └── menu.json           # Menu data
```

## URL Structure
All content is served under the `/flor-de-lotus/` base path:
- Landing page: `/flor-de-lotus/index.html`
- PWA app: `/flor-de-lotus/apps/cardapio/index.html`
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

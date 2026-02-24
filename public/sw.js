// public/sw.js
const CACHE_NAME = 'moviebox-v1';
const STATIC_CACHE_NAME = 'moviebox-static-v1';
const API_CACHE_NAME = 'moviebox-api-v1';

// Assets yang di-cache saat install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/favicon.ico',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force activation
        return self.skipWaiting();
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches that aren't current
          if (cacheName !== STATIC_CACHE_NAME && 
              cacheName !== API_CACHE_NAME && 
              cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle API requests (network first, fallback to cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(event.request));
  }
  // Handle static assets (cache first, fallback to network)
  else if (isStaticAsset(url)) {
    event.respondWith(handleStaticRequest(event.request));
  }
  // Handle navigation/HTML requests (network first, fallback to cache)
  else if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event.request));
  }
  // Default: network first
  else {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});

// Handle API requests - network first, fallback to cache
async function handleAPIRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // If successful, clone and cache
    if (response.status === 200) {
      const responseClone = response.clone();
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.log('API fetch failed, trying cache:', error);
    
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cache, return offline JSON response
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Lo offline bro! Koneksi internet lagi ilang nih 🌍❌' 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets - cache first, fallback to network
async function handleStaticRequest(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If not in cache, fetch from network
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      const responseClone = response.clone();
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.log('Static fetch failed:', error);
    
    // Return a fallback for images
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#141414"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="#e50914">🎬</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    return new Response('Offline', { status: 408 });
  }
}

// Handle navigation - network first, fallback to cached HTML
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    if (response.status === 200) {
      const responseClone = response.clone();
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.log('Navigation fetch failed, serving cached index:', error);
    
    // Fallback to cached index.html
    const cachedIndex = await caches.match('/index.html');
    
    if (cachedIndex) {
      return cachedIndex;
    }
    
    // Last resort: simple offline page
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head><title>Offline - MovieBox</title></head>
        <body style="background:#141414; color:white; text-align:center; padding:50px;">
          <h1 style="color:#e50914;">🎬 MovieBox</h1>
          <p>Lo lagi offline bro! Connect internet dulu ya 📶</p>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Helper to check if URL is static asset
function isStaticAsset(url) {
  const staticExtensions = ['.css', '.js', '.json', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext)) || 
         url.hostname.includes('fonts.googleapis.com') ||
         url.hostname.includes('cdnjs.cloudflare.com');
}

// Background sync for offline actions (future use)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-favorites') {
    console.log('Background sync triggered');
    // Implement favorite syncing later
  }
});

// Push notification handler (future use)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data.text(),
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: { url: '/' }
  };
  
  event.waitUntil(
    self.registration.showNotification('MovieBox Update', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
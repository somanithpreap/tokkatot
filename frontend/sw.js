/* ===============================================
   TOKKATOT SERVICE WORKER
   ===============================================
   Offline caching for Raspberry Pi deployment
   Enables instant loading on local network
   =============================================== */

const CACHE_NAME = 'tokkatot-v1.0.0';
const OFFLINE_URL = '/frontend/pages/404.html';

// Essential files to cache for offline functionality
const ESSENTIAL_FILES = [
  // HTML Pages
  '/frontend/pages/index.html',
  '/frontend/pages/login.html',
  '/frontend/pages/signup.html',
  '/frontend/pages/profile.html',
  '/frontend/pages/settings.html',
  '/frontend/pages/disease-detection.html',
  '/frontend/pages/404.html',
  
  // CSS Files
  '/frontend/css/styleHome.css',
  '/frontend/css/loginSignUp.css',
  '/frontend/css/styleProfile.css',
  '/frontend/css/styleSettings.css',
  '/frontend/css/styleHeader.css',
  '/frontend/css/stylenavbar.css',
  '/frontend/css/styleDiseaseDetection.css',
  
  // JavaScript Files
  '/frontend/js/index.js',
  '/frontend/js/login.js',
  '/frontend/js/signup.js',
  '/frontend/js/profile.js',
  '/frontend/js/scriptSettings.js',
  '/frontend/js/scriptHome.js',
  '/frontend/js/header.js',
  '/frontend/js/navbar.js',
  '/frontend/js/diseaseDetection.js',
  
  // Libraries
  '/frontend/assets/libs/chart.js',
  '/frontend/assets/libs/fontawesome.css',
  '/frontend/assets/fonts/orbitron.css',
  
  // Components
  '/frontend/components/header.html',
  '/frontend/components/navbar.html',
  
  // Essential Assets
  '/frontend/assets/images/tokkatot logo-02.png',
  
  // Manifest
  '/frontend/manifest.json'
];

// Files to cache on demand (images, additional assets)
const CACHE_ON_DEMAND = [
  '/frontend/assets/images/',
  '/frontend/assets/icons/',
  '/frontend/assets/fonts/'
];

/* ===============================================
   SERVICE WORKER INSTALLATION
   =============================================== */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching essential files');
        return cache.addAll(ESSENTIAL_FILES);
      })
      .then(() => {
        console.log('[ServiceWorker] Essential files cached successfully');
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Failed to cache essential files:', error);
      })
  );
});

/* ===============================================
   SERVICE WORKER ACTIVATION
   =============================================== */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Activated successfully');
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

/* ===============================================
   FETCH EVENT HANDLER
   =============================================== */
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other schemes
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('[ServiceWorker] Serving from cache:', event.request.url);
          return cachedResponse;
        }
        
        // Try to fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Check if we should cache this resource
            const shouldCache = shouldCacheResource(event.request.url);
            
            if (shouldCache) {
              // Clone the response for caching
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then((cache) => {
                  console.log('[ServiceWorker] Caching new resource:', event.request.url);
                  cache.put(event.request, responseToCache);
                });
            }
            
            return response;
          })
          .catch((error) => {
            console.log('[ServiceWorker] Network fetch failed:', error);
            
            // Return offline page for navigation requests
            if (event.request.destination === 'document') {
              return caches.match(OFFLINE_URL);
            }
            
            // Return a generic offline response for other requests
            return new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

/* ===============================================
   UTILITY FUNCTIONS
   =============================================== */

/**
 * Determine if a resource should be cached
 * @param {string} url - The URL to check
 * @returns {boolean} - Whether to cache the resource
 */
function shouldCacheResource(url) {
  // Cache frontend assets
  if (url.includes('/frontend/')) {
    return true;
  }
  
  // Cache specific file types
  const cacheableExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf'];
  const urlLower = url.toLowerCase();
  
  return cacheableExtensions.some(ext => urlLower.endsWith(ext));
}

/* ===============================================
   BACKGROUND SYNC (for offline actions)
   =============================================== */
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle offline actions when connection is restored
      handleBackgroundSync()
    );
  }
});

/**
 * Handle background synchronization
 */
async function handleBackgroundSync() {
  try {
    // Sync any pending data when connection is restored
    console.log('[ServiceWorker] Performing background sync');
    
    // This is where you would sync offline actions
    // For now, just log that sync is working
    console.log('[ServiceWorker] Background sync completed');
  } catch (error) {
    console.error('[ServiceWorker] Background sync failed:', error);
  }
}

/* ===============================================
   PUSH NOTIFICATIONS (for system alerts)
   =============================================== */
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }
  
  const options = {
    body: event.data.text(),
    icon: '/frontend/assets/images/tokkatot logo-02.png',
    badge: '/frontend/assets/images/tokkatot logo-02.png',
    vibrate: [200, 100, 200],
    data: {
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'view',
        title: 'ពិនិត្យមើល'
      },
      {
        action: 'dismiss',
        title: 'បដិសេធ'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Tokkatot Alert', options)
  );
});

/* ===============================================
   NOTIFICATION CLICK HANDLER
   =============================================== */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/frontend/pages/index.html')
    );
  }
});

/* ===============================================
   ERROR HANDLING
   =============================================== */
self.addEventListener('error', (event) => {
  console.error('[ServiceWorker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[ServiceWorker] Unhandled promise rejection:', event.reason);
});

console.log('[ServiceWorker] Service Worker loaded successfully');
// Minimal service worker whose only job is to enable ServiceWorkerRegistration.showNotification()
// for local (in-tab) notifications — Android Chrome requires this instead of `new Notification()`.
// This is NOT a push worker: there's no `push` event handler and no server-sent notifications.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

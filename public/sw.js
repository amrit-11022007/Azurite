// ─────────────────────────────────────────────────────────────────────────────
// Azurite Chat - Service Worker for Push Notifications
//
// Service Workers run in the background, independent of the browser tabs.
// This allows the app to:
//   1. Receive background Push Notifications from the backend via the Web Push API.
//   2. Trigger native OS notifications even when the browser or app is closed.
//   3. Handle clicks on notification blocks to focus existing tabs or open new ones.
// ─────────────────────────────────────────────────────────────────────────────

// ─── PUSH EVENT LISTENER ─────────────────────────────────────────────────────
// Triggered by the browser when the push service (FCM, Apple Push, etc.)
// delivers a message dispatched from the backend web-push module.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  // Extract JSON payload sent from backend messageController
  const data = event.data.json();
  const title = data.title || "Azurite";
  
  // Custom display configurations
  const options = {
    body: data.body || "You have a new message",
    icon: "/LogoFull.png",          // Large notification icon
    badge: "/LogoFull.png",         // Small status bar indicator icon
    tag: data.chatId || "azurite-message", // Groups notifications from the same chat
    data: { url: data.url || "/chats" },   // Target URL to open on click
    vibrate: [200, 100, 200],       // Haptic vibration feedback pattern
    renotify: true,                 // Vibrate and sound even if tag matches previous
  };

  // waitUntil ensures the browser doesn't terminate the service worker thread
  // before the native operating system notification has been fully rendered.
  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── NOTIFICATION CLICK LISTENER ─────────────────────────────────────────────
// Triggered when a user taps/clicks the active native OS notification block.
self.addEventListener("notificationclick", (event) => {
  // Dismiss notification instantly from notification shade
  event.notification.close();
  const url = event.notification.data?.url || "/chats";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Step 1: Check if there's already an active open window/tab running the app
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            // Focus the existing tab and bring it to foreground
            return client.focus();
          }
        }
        // Step 2: If no active tab exists, open a brand new browser tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

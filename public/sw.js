// Service Worker for MedRemind Push Notifications
// This script runs in the background, even when the app tab is closed.

self.addEventListener('push', function (event) {
  let data = { title: 'MedRemind', body: 'Time for your medicine!' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'Time for your medicine!',
    icon: '/icons/pill-icon.png',
    badge: '/icons/pill-badge.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'medicine-reminder',
    renotify: true,
    requireInteraction: true, // Keep visible until user interacts
    actions: [
      { action: 'taken', title: '✅ Mark Taken' },
      { action: 'snooze', title: '⏰ Snooze 10min' },
    ],
    data: {
      url: data.url || '/dashboard',
      medicineId: data.medicineId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'MedRemind', options));
});

// Handle notification click
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const action = event.action;
  const url = event.notification.data?.url || '/dashboard';

  if (action === 'taken') {
    // Open the dashboard so the user can confirm
    event.waitUntil(clients.openWindow(url + '?action=taken&med=' + event.notification.data?.medicineId));
  } else if (action === 'snooze') {
    // Re-fire in 10 minutes
    setTimeout(() => {
      self.registration.showNotification(event.notification.title, {
        body: event.notification.body + ' (Snoozed)',
        icon: '/icons/pill-icon.png',
        vibrate: [200, 100, 200],
        tag: 'medicine-reminder-snoozed',
      });
    }, 10 * 60 * 1000);
  } else {
    // Default: open the dashboard
    event.waitUntil(clients.openWindow(url));
  }
});

// Activate immediately
self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

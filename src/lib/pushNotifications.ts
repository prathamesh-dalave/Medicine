import { supabase } from './supabase';

/**
 * Convert a base64 VAPID key to a Uint8Array for the Push API.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are supported in this browser.
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Get the current notification permission state.
 */
export function getPermissionState(): NotificationPermission {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Register the service worker and subscribe the user to push notifications.
 * Saves the subscription to the `push_subscriptions` table in Supabase.
 */
export async function subscribeToPush(): Promise<{ success: boolean; error?: string; pushFailed?: boolean }> {
  try {
    if (!isPushSupported()) {
      return { success: false, error: 'Push notifications are not supported in this browser.' };
    }

    // 1. Ask for notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied.' };
    }

    // 2. Register the service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // 3. Try to subscribe to push (may fail on localhost — that's OK)
    let pushSubscribed = false;
    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (vapidPublicKey) {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        // 4. Save subscription to Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const subscriptionJson = subscription.toJSON();
          await supabase.from('push_subscriptions').upsert(
            {
              user_id: user.id,
              endpoint: subscriptionJson.endpoint,
              p256dh: subscriptionJson.keys?.p256dh,
              auth: subscriptionJson.keys?.auth,
              created_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
        }
        pushSubscribed = true;
      }
    } catch (pushErr) {
      console.warn('Push subscription failed (expected on localhost):', pushErr);
      // Push failed, but browser Notification API still works
    }

    return { 
      success: true, 
      pushFailed: !pushSubscribed 
    };
  } catch (err: any) {
    console.error('Notification setup error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Unsubscribe from push notifications and remove from database.
 */
export async function unsubscribeFromPush(): Promise<{ success: boolean; error?: string }> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return { success: true };

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }

    // Remove from database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Push unsubscribe error:', err);
    return { success: false, error: err.message };
  }
}

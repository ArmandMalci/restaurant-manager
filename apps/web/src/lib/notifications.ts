import axios from 'axios';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function getVapidPublicKey(): Promise<string> {
  const { data } = await axios.get<{ publicKey: string }>('/api/notifications/vapid-public-key');
  return data.publicKey;
}

export async function isSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!registration) return false;
  const sub = await registration.pushManager.getSubscription();
  return !!sub;
}

export async function subscribe(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const publicKey = await getVapidPublicKey();
  if (!publicKey) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const raw = subscription.toJSON();
  await axios.post('/api/notifications/subscribe', {
    endpoint: raw.endpoint,
    keys: { p256dh: raw.keys?.p256dh ?? '', auth: raw.keys?.auth ?? '' },
  });
  return true;
}

export async function unsubscribe(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!registration) return;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await axios.delete('/api/notifications/subscribe', {
    data: { endpoint: subscription.endpoint },
  });
  await subscription.unsubscribe();
}

import {
  deletePushSubscription,
  savePushSubscription,
} from "@/lib/actions/notifications";

// ブラウザで、この端末の通知の受け口（Push の subscription）を扱う。
// 設定画面（components/notification-settings.tsx）とログアウトで使う

export function isPushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// 公開鍵は base64url の文字列で渡されるので、バイト列に直す
function decodeKey(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function currentSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

function toSaveInput(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
  };
}

export function saveSubscription(subscription: PushSubscription) {
  return savePushSubscription(toSaveInput(subscription));
}

// Service Worker を入れて受け口を作り、サーバーに保存する。通知の許可は先に得ておく
export async function subscribeThisDevice(publicKey: string) {
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeKey(publicKey),
    }));
  const result = await saveSubscription(subscription);
  if ("error" in result) {
    await subscription.unsubscribe();
    return false;
  }
  return true;
}

// この端末の受け口を、サーバーとブラウザの両方から消す
export async function unsubscribeThisDevice() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await deletePushSubscription(subscription.endpoint);
  await subscription.unsubscribe();
}

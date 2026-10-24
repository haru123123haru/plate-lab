import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// Service Worker（public/sw.js）が受け取る通知の中身
export interface PushPayload {
  title: string;
  body: string;
  // 通知を押したときに開くページ
  url: string;
  // ホーム画面のアイコンに出す数（public/sw.js）。無ければバッジを変えない
  badge?: number;
}

interface StoredSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

let configured = false;

// 鍵が無い環境（Vercel のプレビューなど）では送らない
export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
}

function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

// 受け口ごとに送る。もう使えない受け口（404・410）は消す。
// 届いた数を返す
export async function sendPush(
  subscriptions: StoredSubscription[],
  payload: PushPayload
): Promise<number> {
  configure();
  const body = JSON.stringify(payload);
  const results = await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
          // 届かない端末に何日も溜めない
          { TTL: 60 * 60 * 12 }
        );
        return true;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // 消せなくても、ほかの受け口への送信は続ける。次に送ったときにまた消す
          await prisma.pushSubscription
            .deleteMany({ where: { id: subscription.id } })
            .catch((deleteError) =>
              console.error("Failed to delete push subscription", deleteError)
            );
        } else {
          console.error("Failed to send push notification", error);
        }
        return false;
      }
    })
  );
  return results.filter(Boolean).length;
}

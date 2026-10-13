"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, Hourglass, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/components/locale-provider";
import { isStandalone } from "@/components/home-screen-guide";
import { sendTestNotification } from "@/lib/actions/notifications";
import { updateUserSettings } from "@/lib/actions/settings";
import { detectHomeScreenGuide } from "@/lib/home-screen-guide";
import {
  currentSubscription,
  isPushSupported,
  saveSubscription,
  subscribeThisDevice,
  unsubscribeThisDevice,
} from "@/lib/push-client";
import type { TranslationKey } from "@/lib/i18n";

type Status =
  | "loading"
  // iPhone は、ホーム画面から開いたときだけ通知を受け取れる
  | "needs-home-screen"
  | "unsupported"
  | "denied"
  | "off"
  | "on";

const statusDescriptions: Record<Status, TranslationKey> = {
  loading: "notificationsDescription",
  "needs-home-screen": "notificationsNeedHomeScreen",
  unsupported: "notificationsUnsupported",
  denied: "notificationsDenied",
  off: "notificationsDescription",
  on: "notificationsDescription",
};

// 何を知らせるか。アカウントごとの設定（UserSettings）の列
type NotificationKind = "notifReminder" | "notifNeglect";

const notificationKinds: {
  kind: NotificationKind;
  icon: typeof Bell;
  label: TranslationKey;
  description: TranslationKey;
}[] = [
  {
    kind: "notifReminder",
    icon: CalendarClock,
    label: "observationReminder",
    description: "reminderDescription",
  },
  {
    kind: "notifNeglect",
    icon: Hourglass,
    label: "neglectNotification",
    description: "neglectDescription",
  },
];

// 設定画面の「通知」の欄。この端末で通知を受けるかの切り替えと、テスト通知、
// 何を知らせるか（アカウントごと）
export function NotificationSettings({
  initialReminder,
  initialNeglect,
}: {
  initialReminder: boolean;
  initialNeglect: boolean;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<TranslationKey | null>(null);
  const [kinds, setKinds] = useState<Record<NotificationKind, boolean>>({
    notifReminder: initialReminder,
    notifNeglect: initialNeglect,
  });
  const [savingKind, setSavingKind] = useState(false);

  // 保存し終わるまで切り替えさせない。続けて押すと、画面と保存した値がずれるため
  const toggleKind = async (kind: NotificationKind, checked: boolean) => {
    setSavingKind(true);
    setKinds((current) => ({ ...current, [kind]: checked }));
    setMessage(null);
    try {
      const result = await updateUserSettings({ [kind]: checked });
      if ("error" in result) throw new Error(result.error);
    } catch (error) {
      console.error(error);
      setKinds((current) => ({ ...current, [kind]: !checked }));
      setMessage("actionFailed");
    } finally {
      setSavingKind(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: Status;
      if (!isPushSupported()) {
        const guide = detectHomeScreenGuide(
          navigator.userAgent,
          navigator.maxTouchPoints
        );
        const onIPhone = guide === "safari" || guide === "chrome";
        next =
          onIPhone && !isStandalone() ? "needs-home-screen" : "unsupported";
      } else if (Notification.permission === "denied") {
        next = "denied";
      } else {
        next = "off";
        try {
          const subscription = await currentSubscription();
          if (subscription && Notification.permission === "granted") {
            next = "on";
            // サーバー側で消えていても（別のアカウントに移ったときなど）、ここで戻す
            await saveSubscription(subscription);
          }
        } catch (error) {
          console.error(error);
        }
      }
      if (!cancelled) setStatus(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async () => {
    // 鍵が無い環境では、許可だけ取って使えないことにならないよう、先に断る
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setMessage("notificationsNotConfigured");
      return;
    }

    // 許可を求めるのは、押した直後でないと iPhone では出ない
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus(permission === "denied" ? "denied" : "off");
      return;
    }

    if (await subscribeThisDevice(publicKey)) {
      setStatus("on");
    } else {
      setMessage("notificationsEnableFailed");
    }
  };

  const toggle = async (checked: boolean) => {
    setBusy(true);
    setMessage(null);
    try {
      if (checked) {
        await enable();
      } else {
        await unsubscribeThisDevice();
        setStatus("off");
      }
    } catch (error) {
      console.error(error);
      setMessage(
        checked ? "notificationsEnableFailed" : "notificationsDisableFailed"
      );
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const subscription = await currentSubscription();
      const result = subscription
        ? await sendTestNotification(subscription.endpoint)
        : ({ error: "not-found" } as const);
      if ("success" in result) {
        setMessage("testNotificationSent");
      } else if (result.error === "not-configured") {
        setMessage("notificationsNotConfigured");
      } else {
        setMessage("testNotificationFailed");
      }
    } catch (error) {
      console.error(error);
      setMessage("testNotificationFailed");
    } finally {
      setBusy(false);
    }
  };

  const canToggle = status === "on" || status === "off";

  return (
    <div>
      <div className="flex w-full items-center gap-3 border-b border-border-subtle py-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-surface">
          <Bell className="size-5 text-text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <label
            htmlFor="notifications-switch"
            className="text-[15px] font-medium text-text-primary"
          >
            {t("notificationsThisDevice")}
          </label>
          <div className="text-[13px] text-text-secondary">
            {t(statusDescriptions[status])}
            {status === "needs-home-screen" && (
              <>
                {" "}
                <Link
                  href="/help#home-screen"
                  className="font-medium text-text-primary underline"
                >
                  {t("homeScreenCardAction")}
                </Link>
              </>
            )}
          </div>
        </div>
        {canToggle && (
          <Switch
            id="notifications-switch"
            checked={status === "on"}
            disabled={busy}
            onCheckedChange={toggle}
          />
        )}
      </div>

      {status === "on" && (
        <button
          type="button"
          onClick={sendTest}
          disabled={busy}
          className="flex w-full cursor-pointer items-center gap-3 border-b border-border-subtle py-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-surface">
            <Send className="size-5 text-text-primary" />
          </div>
          <div className="text-[15px] font-medium text-text-primary">
            {t("sendTestNotification")}
          </div>
        </button>
      )}

      {notificationKinds.map(({ kind, icon: Icon, label, description }) => (
        <div
          key={kind}
          className="flex w-full items-center gap-3 border-b border-border-subtle py-3"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-surface">
            <Icon className="size-5 text-text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <label
              htmlFor={`${kind}-switch`}
              className="text-[15px] font-medium text-text-primary"
            >
              {t(label)}
            </label>
            <div className="text-[13px] text-text-secondary">
              {t(description)}
            </div>
          </div>
          <Switch
            id={`${kind}-switch`}
            checked={kinds[kind]}
            disabled={savingKind}
            onCheckedChange={(checked) => toggleKind(kind, checked)}
          />
        </div>
      ))}

      {message && (
        <p role="status" className="pt-3 text-[13px] text-text-secondary">
          {t(message)}
        </p>
      )}
    </div>
  );
}

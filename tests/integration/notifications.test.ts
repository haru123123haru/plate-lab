import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  deletePushSubscription,
  savePushSubscription,
  sendTestNotification,
} from "@/lib/actions/notifications";
import { createTwoUsers, signInAs } from "./fixtures";

// 本物のプッシュサービスには送らない。鍵があるものとして、持ち主の確かめまで通す
const webPushMock = vi.hoisted(() => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));
vi.mock("web-push", () => ({ default: webPushMock }));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public-key");
  vi.stubEnv("VAPID_PRIVATE_KEY", "private-key");
  vi.stubEnv("VAPID_SUBJECT", "https://example.com");
  webPushMock.sendNotification.mockReset().mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const endpoint = "https://web.push.apple.com/device-1";
const keys = { p256dh: "p256dh", auth: "auth" };

const ownerOf = async (target: string) =>
  (
    await prisma.pushSubscription.findUnique({
      where: { endpoint: target },
      select: { userId: true },
    })
  )?.userId ?? null;

describe("push subscriptions belong to one user", () => {
  it("moves a device to the account that signed in last", async () => {
    const { alice, bob } = await createTwoUsers();
    signInAs(alice);
    await savePushSubscription({ endpoint, keys });
    signInAs(bob);
    await savePushSubscription({ endpoint, keys });

    expect(await ownerOf(endpoint)).toBe(bob.id);
    expect(await prisma.pushSubscription.count()).toBe(1);
  });

  it("does not delete another user's device", async () => {
    const { alice, bob } = await createTwoUsers();
    signInAs(alice);
    await savePushSubscription({ endpoint, keys });
    signInAs(bob);

    await deletePushSubscription(endpoint);
    expect(await ownerOf(endpoint)).toBe(alice.id);

    signInAs(alice);
    await deletePushSubscription(endpoint);
    expect(await ownerOf(endpoint)).toBeNull();
  });

  it("does not send a test notification to another user's device", async () => {
    const { alice, bob } = await createTwoUsers();
    signInAs(alice);
    await savePushSubscription({ endpoint, keys });
    signInAs(bob);

    expect(await sendTestNotification(endpoint)).toEqual({
      error: "not-found",
    });
    expect(webPushMock.sendNotification).not.toHaveBeenCalled();

    signInAs(alice);
    expect(await sendTestNotification(endpoint)).toEqual({ success: true });
    expect(webPushMock.sendNotification).toHaveBeenCalledTimes(1);
  });
});

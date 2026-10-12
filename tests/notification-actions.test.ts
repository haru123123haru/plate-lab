import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  pushSubscription: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
  },
  userSettings: {
    findUnique: vi.fn(),
  },
}));

const pushMock = vi.hoisted(() => ({
  isPushConfigured: vi.fn(),
  sendPush: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getCurrentUserId: async () => "user-a" }));
vi.mock("@/lib/push", () => pushMock);

import {
  deletePushSubscription,
  savePushSubscription,
  sendTestNotification,
} from "../lib/actions/notifications";
import { pushEndpointSchema } from "../lib/validations";

const appleEndpoint = "https://web.push.apple.com/device-1";
const keys = { p256dh: "test-p256dh", auth: "test-auth" };
const stored = {
  id: "sub-1",
  endpoint: appleEndpoint,
  p256dh: keys.p256dh,
  auth: keys.auth,
};

beforeEach(() => {
  vi.clearAllMocks();
  pushMock.isPushConfigured.mockReturnValue(true);
  pushMock.sendPush.mockResolvedValue(1);
  prismaMock.userSettings.findUnique.mockResolvedValue({ language: "ja" });
});

describe("pushEndpointSchema", () => {
  it.each([
    appleEndpoint,
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://jmt17.google.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
  ])("accepts %s", (endpoint) => {
    expect(pushEndpointSchema.safeParse(endpoint).success).toBe(true);
  });

  it.each([
    "http://web.push.apple.com/abc",
    "https://example.com/push",
    "https://push.apple.com.example.com/abc",
    "https://evilgoogle.com/abc",
    "https://script.google.com/macros/s/abc/exec",
    "https://127.0.0.1/abc",
    "not a url",
  ])("rejects %s", (endpoint) => {
    expect(pushEndpointSchema.safeParse(endpoint).success).toBe(false);
  });
});

describe("savePushSubscription", () => {
  it("saves the endpoint for the signed-in user", async () => {
    expect(
      await savePushSubscription({ endpoint: appleEndpoint, keys })
    ).toEqual({ success: true });
    expect(prismaMock.pushSubscription.upsert).toHaveBeenCalledWith({
      where: { endpoint: appleEndpoint },
      update: { userId: "user-a", ...keys },
      create: { userId: "user-a", endpoint: appleEndpoint, ...keys },
    });
  });

  it("rejects an endpoint outside the push services", async () => {
    expect(
      await savePushSubscription({ endpoint: "https://example.com/x", keys })
    ).toEqual({ error: "Unsupported push service" });
    expect(prismaMock.pushSubscription.upsert).not.toHaveBeenCalled();
  });
});

describe("deletePushSubscription", () => {
  it("deletes only the signed-in user's endpoint", async () => {
    await deletePushSubscription(appleEndpoint);
    expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-a", endpoint: appleEndpoint },
    });
  });
});

describe("sendTestNotification", () => {
  it("sends to this device in the user's language", async () => {
    prismaMock.pushSubscription.findFirst.mockResolvedValue(stored);

    expect(await sendTestNotification(appleEndpoint)).toEqual({
      success: true,
    });
    expect(prismaMock.pushSubscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-a", endpoint: appleEndpoint },
      })
    );
    expect(pushMock.sendPush).toHaveBeenCalledWith([stored], {
      title: "テスト通知",
      body: "この端末に通知が届きました。",
      url: "/settings",
    });
  });

  it("does not send to an endpoint the user does not have", async () => {
    prismaMock.pushSubscription.findFirst.mockResolvedValue(null);

    expect(await sendTestNotification(appleEndpoint)).toEqual({
      error: "not-found",
    });
    expect(pushMock.sendPush).not.toHaveBeenCalled();
  });

  it("does not send without the VAPID keys", async () => {
    pushMock.isPushConfigured.mockReturnValue(false);

    expect(await sendTestNotification(appleEndpoint)).toEqual({
      error: "not-configured",
    });
    expect(pushMock.sendPush).not.toHaveBeenCalled();
  });

  it("reports a failure when nothing was delivered", async () => {
    prismaMock.pushSubscription.findFirst.mockResolvedValue(stored);
    pushMock.sendPush.mockResolvedValue(0);

    expect(await sendTestNotification(appleEndpoint)).toEqual({
      error: "failed",
    });
  });
});

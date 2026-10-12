import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  pushSubscription: { deleteMany: vi.fn() },
}));

const webPushMock = vi.hoisted(() => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("web-push", () => ({ default: webPushMock }));

import { sendPush } from "../lib/push";

const subscription = (id: string) => ({
  id,
  endpoint: `https://web.push.apple.com/${id}`,
  p256dh: "p256dh",
  auth: "auth",
});

const payload = { title: "Title", body: "Body", url: "/" };

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("sendPush", () => {
  it("sends the payload to each subscription and counts deliveries", async () => {
    webPushMock.sendNotification.mockResolvedValue({});

    expect(
      await sendPush([subscription("a"), subscription("b")], payload)
    ).toBe(2);
    expect(webPushMock.sendNotification).toHaveBeenCalledWith(
      {
        endpoint: "https://web.push.apple.com/a",
        keys: { p256dh: "p256dh", auth: "auth" },
      },
      JSON.stringify(payload),
      expect.objectContaining({ TTL: expect.any(Number) })
    );
  });

  it.each([404, 410])(
    "deletes a subscription the push service no longer knows (%i)",
    async (statusCode) => {
      webPushMock.sendNotification.mockRejectedValue({ statusCode });

      expect(await sendPush([subscription("gone")], payload)).toBe(0);
      expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { id: "gone" },
      });
    }
  );

  it("keeps sending when deleting a gone subscription fails", async () => {
    webPushMock.sendNotification
      .mockRejectedValueOnce({ statusCode: 410 })
      .mockResolvedValueOnce({});
    prismaMock.pushSubscription.deleteMany.mockRejectedValue(
      new Error("db down")
    );

    expect(
      await sendPush([subscription("gone"), subscription("ok")], payload)
    ).toBe(1);
  });

  it("keeps a subscription after a temporary failure", async () => {
    webPushMock.sendNotification.mockRejectedValue({ statusCode: 500 });

    expect(await sendPush([subscription("busy")], payload)).toBe(0);
    expect(prismaMock.pushSubscription.deleteMany).not.toHaveBeenCalled();
  });
});

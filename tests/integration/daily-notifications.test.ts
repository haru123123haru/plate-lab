import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { sendDailyNotifications } from "@/lib/daily-notifications";
import { createPlate, createTwoUsers } from "./fixtures";

// 本物のプッシュサービスには送らない。送った先と中身を見る
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

// 土台のプレートは 2026-10-01 に仕込み、既定で 7 日目にリマインドする。
// 日本時間の 2026-10-08 9:30 に走ったものとする
const MORNING_OF_DAY_7 = new Date("2026-10-08T00:30:00Z");

const subscribe = (userId: string, device: string) =>
  prisma.pushSubscription.create({
    data: {
      userId,
      endpoint: `https://web.push.apple.com/${device}`,
      p256dh: "test-p256dh",
      auth: "test-auth",
    },
  });

// 送った通知を、送り先の端末ごとに
const sent = () =>
  webPushMock.sendNotification.mock.calls.map(([subscription, body]) => ({
    device: subscription.endpoint.split("/").pop(),
    ...JSON.parse(body),
  }));

describe("daily observation reminders", () => {
  it("sends each user only their own plates", async () => {
    const { alice, bob, alicePlate, bobPlate } = await createTwoUsers();
    await subscribe(alice.id, "alice-phone");
    await subscribe(bob.id, "bob-phone");

    expect(await sendDailyNotifications(MORNING_OF_DAY_7)).toEqual({
      notifiedUsers: 2,
      deliveries: 2,
    });
    expect(sent()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          device: "alice-phone",
          body: expect.stringContaining("Alice lysozyme"),
          url: `/plates/${alicePlate.plate.id}`,
        }),
        expect.objectContaining({
          device: "bob-phone",
          body: expect.stringContaining("Bob lysozyme"),
          url: `/plates/${bobPlate.plate.id}`,
        }),
      ])
    );
  });

  it("sends nothing before the day or after the catch-up window", async () => {
    const { alice } = await createTwoUsers();
    await subscribe(alice.id, "alice-phone");

    for (const day of ["2026-10-07", "2026-10-12"]) {
      expect(
        await sendDailyNotifications(new Date(`${day}T00:30:00Z`))
      ).toEqual({ notifiedUsers: 0, deliveries: 0 });
    }
    expect(webPushMock.sendNotification).not.toHaveBeenCalled();
  });

  it("sends a missed reminder late, and only once", async () => {
    const { alice, alicePlate } = await createTwoUsers();
    await subscribe(alice.id, "alice-phone");
    const dayAfter = new Date("2026-10-09T00:30:00Z");

    expect(await sendDailyNotifications(dayAfter)).toEqual({
      notifiedUsers: 1,
      deliveries: 1,
    });
    // Cron が二度呼ばれても、翌日も、同じ分は送らない
    expect(await sendDailyNotifications(dayAfter)).toEqual({
      notifiedUsers: 0,
      deliveries: 0,
    });
    expect(
      await sendDailyNotifications(new Date("2026-10-10T00:30:00Z"))
    ).toEqual({ notifiedUsers: 0, deliveries: 0 });
    expect(
      await prisma.plate.findUnique({
        where: { id: alicePlate.plate.id },
        select: { reminderSentFor: true },
      })
    ).toEqual({ reminderSentFor: new Date("2026-10-08T00:00:00Z") });
  });

  it("tries again the next morning when nothing was delivered", async () => {
    const { alice } = await createTwoUsers();
    await subscribe(alice.id, "alice-phone");
    vi.spyOn(console, "error").mockImplementation(() => {});
    webPushMock.sendNotification.mockRejectedValueOnce({ statusCode: 500 });

    expect(await sendDailyNotifications(MORNING_OF_DAY_7)).toEqual({
      notifiedUsers: 0,
      deliveries: 0,
    });
    expect(
      await sendDailyNotifications(new Date("2026-10-09T00:30:00Z"))
    ).toEqual({ notifiedUsers: 1, deliveries: 1 });
  });

  it("skips plates in the trash, turned off, or observed since the day", async () => {
    const { alice, sharedType, alicePlate } = await createTwoUsers();
    await subscribe(alice.id, "alice-phone");
    await prisma.observation.create({
      data: {
        dropId: alicePlate.drop!.id,
        observedAt: new Date("2026-10-08T00:00:00Z"),
        notes: "looked this morning",
      },
    });
    await createPlate({
      ownerId: alice.id,
      plateTypeId: sharedType.id,
      name: "Trashed",
      trashed: true,
    });
    const { plate: quiet } = await createPlate({
      ownerId: alice.id,
      plateTypeId: sharedType.id,
      name: "Quiet",
    });
    await prisma.plate.update({
      where: { id: quiet.id },
      data: { reminderDays: null },
    });

    expect(await sendDailyNotifications(MORNING_OF_DAY_7)).toEqual({
      notifiedUsers: 0,
      deliveries: 0,
    });
  });

  it("puts several plates in one notification on every device", async () => {
    const { alice, sharedType } = await createTwoUsers();
    await subscribe(alice.id, "alice-phone");
    await subscribe(alice.id, "alice-laptop");
    await createPlate({
      ownerId: alice.id,
      plateTypeId: sharedType.id,
      name: "Alice thaumatin",
    });
    await prisma.userSettings.create({
      data: { userId: alice.id, language: "ja" },
    });

    await sendDailyNotifications(MORNING_OF_DAY_7);
    expect(sent()).toEqual([
      expect.objectContaining({
        device: expect.stringMatching(/alice-/),
        title: "観察の時期です",
        body: expect.stringMatching(/^2 枚のプレートが観察どきです: /),
        url: "/",
      }),
      expect.objectContaining({ device: expect.stringMatching(/alice-/) }),
    ]);
  });

  it("does not send to users who turned reminders off or have no device", async () => {
    const { alice } = await createTwoUsers();
    await subscribe(alice.id, "alice-phone");
    await prisma.userSettings.create({
      data: { userId: alice.id, notifReminder: false },
    });

    expect(await sendDailyNotifications(MORNING_OF_DAY_7)).toEqual({
      notifiedUsers: 0,
      deliveries: 0,
    });
  });
});

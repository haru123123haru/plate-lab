import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jobMock = vi.hoisted(() => ({ sendDailyNotifications: vi.fn() }));
const pushMock = vi.hoisted(() => ({ isPushConfigured: vi.fn() }));

vi.mock("@/lib/daily-notifications", () => jobMock);
vi.mock("@/lib/push", () => pushMock);

import { GET } from "../app/api/cron/notifications/route";

const call = (authorization?: string) =>
  GET(
    new Request("https://plate-manage-app.vercel.app/api/cron/notifications", {
      headers: authorization ? { authorization } : {},
    })
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "cron-test-value");
  pushMock.isPushConfigured.mockReturnValue(true);
  jobMock.sendDailyNotifications.mockResolvedValue({
    notifiedUsers: 1,
    deliveries: 2,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/cron/notifications", () => {
  it("runs the daily notifications for Vercel Cron", async () => {
    const response = await call("Bearer cron-test-value");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ notifiedUsers: 1, deliveries: 2 });
    expect(jobMock.sendDailyNotifications).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, "Bearer wrong", "cron-test-value"])(
    "refuses %j",
    async (authorization) => {
      expect((await call(authorization)).status).toBe(401);
      expect(jobMock.sendDailyNotifications).not.toHaveBeenCalled();
    }
  );

  it("refuses everyone when CRON_SECRET is not set", async () => {
    vi.stubEnv("CRON_SECRET", "");

    expect((await call("Bearer ")).status).toBe(401);
    expect(jobMock.sendDailyNotifications).not.toHaveBeenCalled();
  });

  it("does nothing without the push keys", async () => {
    pushMock.isPushConfigured.mockReturnValue(false);

    expect((await call("Bearer cron-test-value")).status).toBe(503);
    expect(jobMock.sendDailyNotifications).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  upsert: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession: mocks.exchangeCodeForSession },
  }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { upsert: mocks.upsert } } }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { completeOAuthSignIn } from "../lib/actions/auth";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("completeOAuthSignIn", () => {
  it("exchanges the code, creates the user if missing, and goes home", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          id: "user-a",
          email: "a@example.com",
          user_metadata: { full_name: "Alice" },
        },
      },
      error: null,
    });

    await completeOAuthSignIn("code-1");

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("code-1");
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { id: "user-a" },
      create: { id: "user-a", email: "a@example.com", name: "Alice" },
      update: {},
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("falls back to the email's local part for the name", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: {
        user: { id: "user-b", email: "bob@example.com", user_metadata: {} },
      },
      error: null,
    });

    await completeOAuthSignIn("code-2");

    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { id: "user-b", email: "bob@example.com", name: "bob" },
      })
    );
  });

  it("returns the error and does not touch the database when the exchange fails", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid flow state" },
    });

    const result = await completeOAuthSignIn("used-code");

    expect(result).toEqual({ error: "invalid flow state" });
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("rejects an empty code without calling Supabase", async () => {
    const result = await completeOAuthSignIn("");

    expect(result).toEqual({ error: "Missing authorization code" });
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";
import {
  detectHomeScreenGuide,
  getHomeScreenGuide,
  HOME_SCREEN_GUIDE_IDS,
} from "../lib/home-screen-guide";

const UA = {
  iPhoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  iPhoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.0.0 Mobile/15E148 Safari/604.1",
  iPhoneFirefox:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/143.0 Mobile/15E148 Safari/605.1.15",
  // iPad の Safari は Mac と同じ名乗り
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  android:
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
};

describe("detectHomeScreenGuide", () => {
  it("picks Safari for iPhone Safari", () => {
    expect(detectHomeScreenGuide(UA.iPhoneSafari, 5)).toBe("safari");
  });

  it("picks Chrome for iPhone Chrome", () => {
    expect(detectHomeScreenGuide(UA.iPhoneChrome, 5)).toBe("chrome");
  });

  it("falls back to Safari for other iPhone browsers", () => {
    expect(detectHomeScreenGuide(UA.iPhoneFirefox, 5)).toBe("safari");
  });

  it("treats a Mac name with touch as an iPad", () => {
    expect(detectHomeScreenGuide(UA.macSafari, 5)).toBe("safari");
  });

  it("shows nothing on a Mac", () => {
    expect(detectHomeScreenGuide(UA.macSafari, 0)).toBeNull();
  });

  it("picks Android for Android", () => {
    expect(detectHomeScreenGuide(UA.android, 5)).toBe("android");
  });

  it("shows nothing on Windows", () => {
    expect(detectHomeScreenGuide(UA.windowsChrome, 0)).toBeNull();
  });
});

describe("getHomeScreenGuide", () => {
  it("has the same number of steps in both languages", () => {
    for (const id of HOME_SCREEN_GUIDE_IDS) {
      expect(getHomeScreenGuide("en", id).steps.map((s) => s.image)).toEqual(
        getHomeScreenGuide("ja", id).steps.map((s) => s.image)
      );
    }
  });
});

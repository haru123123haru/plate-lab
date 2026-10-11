import type { Locale } from "@/lib/i18n";

// 「ホーム画面に追加」の案内。ホームのカードとヘルプの両方で使う。
// 写真は scripts/generate-home-screen-guide.mjs で iPhone のスクショから書き出したもの

export type HomeScreenGuideId = "safari" | "chrome" | "android";

export const HOME_SCREEN_GUIDE_IDS: HomeScreenGuideId[] = [
  "safari",
  "chrome",
  "android",
];

export interface HomeScreenGuideImage {
  src: string;
  width: number;
  height: number;
}

export interface HomeScreenGuide {
  label: string;
  steps: { text: string; image?: HomeScreenGuideImage }[];
  notes?: string[];
}

const image = (name: string, height: number): HomeScreenGuideImage => ({
  src: `/help/home-screen/${name}.webp`,
  width: 720,
  height,
});

const images = {
  safariMore: image("safari-1", 401),
  safariShare: image("safari-2", 708),
  safariViewMore: image("safari-3", 721),
  chromeShare: image("chrome-1", 116),
  chromeViewMore: image("chrome-2", 684),
  addToHome: image("add-to-home", 803),
  confirm: image("confirm", 696),
};

const guides: Record<Locale, Record<HomeScreenGuideId, HomeScreenGuide>> = {
  ja: {
    safari: {
      label: "iPhone Safari",
      steps: [
        { text: "画面右下の「…」を押す", image: images.safariMore },
        { text: "「共有」を押す", image: images.safariShare },
        { text: "「表示を増やす」を押す", image: images.safariViewMore },
        { text: "「ホーム画面に追加」を押す", image: images.addToHome },
        {
          text: "「Webアプリとして開く」がオンなのを確かめ、右上の「追加」を押す",
          image: images.confirm,
        },
      ],
      notes: [
        "「…」が無く、画面の下に共有ボタン（四角から上向きの矢印）があるときは、それを押して手順3に進んでください。",
        "共有の画面に「ホーム画面に追加」が初めから見えているときは、そのまま押してください。",
      ],
    },
    chrome: {
      label: "iPhone Chrome",
      steps: [
        {
          text: "アドレスバーの右にある共有ボタンを押す",
          image: images.chromeShare,
        },
        { text: "「表示を増やす」を押す", image: images.chromeViewMore },
        { text: "「ホーム画面に追加」を押す", image: images.addToHome },
        {
          text: "「Webアプリとして開く」がオンなのを確かめ、右上の「追加」を押す",
          image: images.confirm,
        },
      ],
    },
    android: {
      label: "Android",
      steps: [
        { text: "右上の︙メニューを押す" },
        { text: "「ホーム画面に追加」か「アプリをインストール」を押す" },
        { text: "「インストール」（または「追加」）を押す" },
      ],
    },
  },
  en: {
    safari: {
      label: "iPhone Safari",
      steps: [
        { text: 'Tap "…" at the bottom right', image: images.safariMore },
        { text: 'Tap "Share"', image: images.safariShare },
        { text: 'Tap "View More"', image: images.safariViewMore },
        { text: 'Tap "Add to Home Screen"', image: images.addToHome },
        {
          text: 'Make sure "Open as Web App" is on, then tap "Add" at the top right',
          image: images.confirm,
        },
      ],
      notes: [
        'If there is no "…" and you see a share button (a square with an up arrow) at the bottom, tap it and go to step 3.',
        'If "Add to Home Screen" is already shown in the share sheet, just tap it.',
        "The screenshots show an iPhone set to Japanese.",
      ],
    },
    chrome: {
      label: "iPhone Chrome",
      steps: [
        {
          text: "Tap the share button at the right of the address bar",
          image: images.chromeShare,
        },
        { text: 'Tap "View More"', image: images.chromeViewMore },
        { text: 'Tap "Add to Home Screen"', image: images.addToHome },
        {
          text: 'Make sure "Open as Web App" is on, then tap "Add" at the top right',
          image: images.confirm,
        },
      ],
      notes: ["The screenshots show an iPhone set to Japanese."],
    },
    android: {
      label: "Android",
      steps: [
        { text: "Tap the ⋮ menu at the top right" },
        { text: 'Tap "Add to Home screen" or "Install app"' },
        { text: 'Tap "Install" (or "Add")' },
      ],
    },
  },
};

export function getHomeScreenGuide(
  locale: Locale,
  id: HomeScreenGuideId
): HomeScreenGuide {
  return guides[locale][id];
}

// 開いているブラウザから、どの案内を出すかを決める。パソコンなら null。
// iPad の Safari はパソコンの Mac と同じ名乗りをするので、タッチ点の数で見分ける
export function detectHomeScreenGuide(
  userAgent: string,
  maxTouchPoints: number
): HomeScreenGuideId | null {
  if (/Android/i.test(userAgent)) return "android";
  const isIOS =
    /iPhone|iPad|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  if (!isIOS) return null;
  // iPhone の Chrome は CriOS と名乗る。ほかのブラウザ（Firefox・Edge など）は Safari の案内に寄せる
  return /CriOS/.test(userAgent) ? "chrome" : "safari";
}

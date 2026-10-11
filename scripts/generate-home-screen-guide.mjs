// ヘルプとホームの「ホーム画面に追加」の案内に使う写真を、iPhone のスクショから書き出す。
// 押す場所に印を付け、要る範囲だけを切り抜く（時計や電池、ほかのアプリの機能は写さない）。
// 元のスクショは個人の端末の画面なので、リポジトリには入れない。
// 実行: node scripts/generate-home-screen-guide.mjs <スクショのフォルダ>
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error(
    "使い方: node scripts/generate-home-screen-guide.mjs <スクショのフォルダ>"
  );
  process.exit(1);
}

// 座標は元のスクショ（1179×2556）の画素。crop は切り抜く縦の範囲、mark は押す場所の印
const shots = [
  // Safari: 右下の「…」
  {
    out: "safari-1",
    src: "safari-1.PNG",
    crop: [1900, 2556],
    mark: { type: "circle", cx: 1005, cy: 2382, r: 95 },
  },
  // Safari: メニューの「共有」
  {
    out: "safari-2",
    src: "safari-2.PNG",
    crop: [1320, 2480],
    mark: { type: "rect", x: 380, y: 1375, w: 700, h: 130 },
  },
  // Safari: 共有シートの「表示を増やす」
  {
    out: "safari-3",
    src: "safari-3.PNG",
    crop: [1350, 2530],
    mark: { type: "circle", cx: 978, cy: 2280, r: 110 },
  },
  // Chrome: アドレスバーの右の共有ボタン
  {
    out: "chrome-1",
    src: "chrome-1.jpg",
    crop: [150, 340],
    mark: { type: "circle", cx: 1080, cy: 241, r: 75 },
  },
  // Chrome: 共有シートの「表示を増やす」
  {
    out: "chrome-2",
    src: "chrome-2.PNG",
    crop: [285, 1405],
    mark: { type: "circle", cx: 978, cy: 1110, r: 110 },
  },
  // 共通: 一覧の「ホーム画面に追加」。下に並ぶ、その人が入れたアプリの機能は写さない
  {
    out: "add-to-home",
    src: "chrome-3.PNG",
    crop: [180, 1495],
    mark: { type: "rect", x: 50, y: 1345, w: 1080, h: 140 },
  },
  // 共通: 名前と「Webアプリとして開く」を確かめて「追加」。キーボードは写さない
  {
    out: "confirm",
    src: "chrome-4.PNG",
    crop: [150, 1290],
    mark: { type: "rect", x: 925, y: 255, w: 215, h: 130, rx: 65 },
  },
];

const MARK_COLOR = "#FF3B30";
const STROKE = 12;
// 書き出す幅。画面では 350px ほどで出すので、2倍の密度にする
const OUT_WIDTH = 720;

for (const { out, src, crop, mark } of shots) {
  const [top, bottom] = crop;
  const width = 1179;
  const height = bottom - top;
  const shape =
    mark.type === "circle"
      ? `<circle cx="${mark.cx}" cy="${mark.cy - top}" r="${mark.r}" />`
      : `<rect x="${mark.x}" y="${mark.y - top}" width="${mark.w}" height="${mark.h}" rx="${mark.rx ?? 28}" />`;
  const overlay = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="${MARK_COLOR}" stroke-width="${STROKE}">${shape}</g></svg>`
  );
  const file = `public/help/home-screen/${out}.webp`;
  // sharp は composite を resize のあとにかけるので、切り抜きと印を先に済ませてから縮める
  const marked = await sharp(`${sourceDir}/${src}`)
    .toColourspace("srgb")
    .extract({ left: 0, top, width, height })
    .composite([{ input: overlay }])
    .png()
    .toBuffer();
  const info = await sharp(marked)
    .resize(OUT_WIDTH)
    .webp({ quality: 82 })
    .toFile(`${root}${file}`);
  console.log(
    `${file} (${info.width}x${info.height}, ${Math.round(info.size / 1024)}KB)`
  );
}

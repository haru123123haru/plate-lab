// アプリのアイコンを、元の絵（scripts/icon-source.png）から各サイズに書き出す。
// 実行: node scripts/generate-icons.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = `${root}scripts/icon-source.png`;

// size: 書き出す大きさ。content: 絵（フラスコ）の長い辺が、全体の何割を占めるか
const outputs = [
  // タブのアイコン。小さいので、絵を大きくする
  { file: "app/icon.png", size: 32, content: 0.9 },
  // iPhone のホーム画面
  { file: "app/apple-icon.png", size: 180, content: 0.68 },
  // manifest（purpose: "any"）
  { file: "public/icon-192x192.png", size: 192, content: 0.68 },
  { file: "public/icon-512x512.png", size: 512, content: 0.68 },
  // manifest（purpose: "maskable"）。丸く切り抜かれても欠けないよう、中央の円（直径 80%）に収める
  { file: "public/icon-maskable-512x512.png", size: 512, content: 0.54 },
];

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// 元の絵は、角丸の外側の四隅が黒い。四隅から黒をたどって白く塗り、背景を全面白にする
async function loadCleaned() {
  const { data, info } = await sharp(source)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const lum = (i) =>
    0.299 * data[i * channels] +
    0.587 * data[i * channels + 1] +
    0.114 * data[i * channels + 2];

  const seen = new Uint8Array(width * height);
  const stack = [0, width - 1, (height - 1) * width, height * width - 1];
  while (stack.length > 0) {
    const p = stack.pop();
    if (seen[p] || lum(p) > 200) continue;
    seen[p] = 1;
    data.fill(255, p * channels, p * channels + channels);
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - width);
    if (y < height - 1) stack.push(p + width);
  }

  // 元の絵の白は 250〜254 くらいでむらがあり、真っ白の余白と並べると境目が見える。明るい画素は真っ白にそろえる
  for (let i = 0; i < data.length; i++) {
    if (data[i] >= 235) data[i] = 255;
  }

  // 絵の範囲（暗い画素の外接矩形）
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  for (let p = 0; p < width * height; p++) {
    if (lum(p) >= 128) continue;
    const x = p % width;
    const y = (p - x) / width;
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }

  const image = await sharp(data, { raw: { width, height, channels } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .png()
    .toBuffer();
  return { image, width: right - left + 1, height: bottom - top + 1 };
}

const art = await loadCleaned();

for (const { file, size, content } of outputs) {
  const scale = (size * content) / Math.max(art.width, art.height);
  const w = Math.round(art.width * scale);
  const h = Math.round(art.height * scale);
  const resized = await sharp(art.image)
    .resize(w, h, { kernel: "lanczos3" })
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: WHITE },
  })
    .composite([
      {
        input: resized,
        left: Math.round((size - w) / 2),
        top: Math.round((size - h) / 2),
      },
    ])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(`${root}${file}`);
  console.log(`${file} (${size}x${size})`);
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import QRCode from "react-qr-code";
import { SectionHeader } from "@/components/section-header";
import { useTranslation } from "@/components/locale-provider";

interface PlateQrCodeProps {
  plateId: string;
  plateName: string;
}

// プレートの詳細画面を開く QR コード。PNG で保存して、プレートに貼れる
export function PlateQrCode({ plateId, plateName }: PlateQrCodeProps) {
  const { t } = useTranslation();
  const qrRef = useRef<HTMLDivElement>(null);
  const [qrUrl, setQrUrl] = useState(`/plates/${plateId}`);

  useEffect(() => {
    setQrUrl(`${window.location.origin}/plates/${plateId}`);
  }, [plateId]);

  // iPhone の共有シートは、押した直後でないと開けない。押してから画像を作ると間に合わないので、先に作っておく
  const [qrPng, setQrPng] = useState<Blob | null>(null);

  useEffect(() => {
    // 最初の描画では URL がまだ相対パスなので、絶対 URL になってから作る
    const svg = qrRef.current?.querySelector("svg");
    if (!svg || !qrUrl.startsWith("http")) return;
    let cancelled = false;
    renderQrPng(svg).then((blob) => {
      if (!cancelled) setQrPng(blob);
    });
    return () => {
      cancelled = true;
    };
  }, [qrUrl]);

  const handleDownloadQR = useCallback(() => {
    if (!qrPng) return;
    const file = new File([qrPng], `${plateName}-qr.png`, {
      type: "image/png",
    });

    // スマホは <a download> では何も起きないことがある（iPhone のホーム画面のアプリなど）。
    // 共有シートを開き、「画像を保存」やプリントを選んでもらう
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch && navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file] }).catch((error: unknown) => {
        // 共有シートを閉じただけのときは何もしない
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        downloadFile(file);
      });
      return;
    }
    downloadFile(file);
  }, [plateName, qrPng]);

  return (
    <div>
      <SectionHeader label={t("qrCode")} />
      <div className="mt-3 rounded-xl bg-bg-surface p-6">
        <div ref={qrRef} className="flex justify-center">
          <QRCode
            value={qrUrl}
            size={128}
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
        </div>
        <button
          type="button"
          onClick={handleDownloadQR}
          disabled={!qrPng}
          className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-default bg-bg-primary py-2.5 text-[14px] font-medium text-text-primary transition-colors hover:bg-border-subtle disabled:cursor-default disabled:opacity-50"
        >
          <Download className="size-4" />
          {t("downloadQr")}
        </button>
      </div>
    </div>
  );
}

const PNG_SIZE = 512;
// QR の周りの白い余白。読み取りには 4 モジュール分ほど要る
const PNG_MARGIN = 48;

// 画面の QR（SVG）を、周りに余白を付けた白地の PNG にする
function renderQrPng(svg: SVGSVGElement): Promise<Blob | null> {
  const svgData = new XMLSerializer().serializeToString(svg);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = PNG_SIZE;
      canvas.height = PNG_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, PNG_SIZE, PNG_SIZE);
      const inner = PNG_SIZE - PNG_MARGIN * 2;
      ctx.drawImage(img, PNG_MARGIN, PNG_MARGIN, inner, inner);
      canvas.toBlob(resolve, "image/png");
    };
    img.onerror = () => resolve(null);
    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  });
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.download = file.name;
  link.href = url;
  link.click();
  // すぐに消すと、Safari ではダウンロードが始まらないことがある
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

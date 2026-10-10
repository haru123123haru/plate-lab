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

// プレートの詳細画面を開く QR コード。PNG で落として、プレートに貼れる
export function PlateQrCode({ plateId, plateName }: PlateQrCodeProps) {
  const { t } = useTranslation();
  const qrRef = useRef<HTMLDivElement>(null);
  const [qrUrl, setQrUrl] = useState(`/plates/${plateId}`);

  useEffect(() => {
    setQrUrl(`${window.location.origin}/plates/${plateId}`);
  }, [plateId]);

  const handleDownloadQR = useCallback(() => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const link = document.createElement("a");
      link.download = `${plateName}-qr.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  }, [plateName]);

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
          className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-default bg-bg-primary py-2.5 text-[14px] font-medium text-text-primary transition-colors hover:bg-border-subtle"
        >
          <Download className="size-4" />
          {t("downloadQr")}
        </button>
      </div>
    </div>
  );
}

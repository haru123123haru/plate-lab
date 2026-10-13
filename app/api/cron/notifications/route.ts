import { NextResponse } from "next/server";
import { isPushConfigured } from "@/lib/push";
import { sendDailyNotifications } from "@/lib/daily-notifications";

// 毎朝の通知。Vercel Cron が vercel.json の crons の時刻に呼ぶ。
// Vercel は CRON_SECRET を Authorization に付けて呼ぶので、それ以外は断る
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "Push is not configured" },
      { status: 503 }
    );
  }

  const result = await sendDailyNotifications();
  return NextResponse.json(result);
}

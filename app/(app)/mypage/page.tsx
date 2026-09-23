import { getCurrentUser } from "@/lib/actions/user";
import { getPlates, getTrashedPlates } from "@/lib/actions/plates";
import { MyPageClient } from "./mypage-client";

export default async function MyPage() {
  const [user, plates, trashedPlates] = await Promise.all([
    getCurrentUser(),
    getPlates(),
    getTrashedPlates(),
  ]);

  return (
    <MyPageClient
      user={user}
      stats={{
        totalPlates: plates.length,
        trashedPlates: trashedPlates.length,
      }}
    />
  );
}

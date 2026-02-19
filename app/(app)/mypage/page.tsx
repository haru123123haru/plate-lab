import { getCurrentUser } from "@/lib/actions/user";
import { getPlates } from "@/lib/actions/plates";
import { MyPageClient } from "./mypage-client";

export default async function MyPage() {
  const [user, plates] = await Promise.all([getCurrentUser(), getPlates()]);

  const totalPlates = plates.length;
  const activePlates = plates.filter((p) => p.status === "ACTIVE").length;
  const archivedPlates = plates.filter((p) => p.status === "ARCHIVED").length;

  return (
    <MyPageClient
      user={user}
      stats={{ totalPlates, activePlates, archivedPlates }}
    />
  );
}

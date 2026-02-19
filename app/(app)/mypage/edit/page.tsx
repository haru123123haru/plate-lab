import { getCurrentUser } from "@/lib/actions/user";
import { EditProfileClient } from "./edit-client";

export default async function EditProfilePage() {
  const user = await getCurrentUser();

  return (
    <EditProfileClient
      user={{
        name: user.name,
        role: user.role ?? "",
        email: user.email,
        organization: user.organization ?? "",
        bio: user.bio ?? "",
      }}
    />
  );
}

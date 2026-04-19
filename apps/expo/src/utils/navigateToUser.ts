import { router } from "expo-router";

import type { UserForDisplay } from "~/types/user";

export function navigateToUser(
  user: Pick<UserForDisplay, "id" | "username">,
  currentUserId?: string,
) {
  if (currentUserId && user.id === currentUserId) {
    router.push("/settings/account");
  } else {
    router.push(`/${user.username}`);
  }
}

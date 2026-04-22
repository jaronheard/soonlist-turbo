import type { UserForDisplay } from "~/types/user";

interface EnrichedEventFollow {
  userId: string;
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    userImage?: string | null;
  } | null;
}

export function eventFollowsToSavers(
  eventFollows: EnrichedEventFollow[] | undefined,
  options: { excludeUserId?: string } = {},
): UserForDisplay[] {
  if (!eventFollows) return [];
  const { excludeUserId } = options;
  const savers: UserForDisplay[] = [];
  for (const follow of eventFollows) {
    if (!follow.user) continue;
    if (excludeUserId && follow.userId === excludeUserId) continue;
    savers.push({
      id: follow.user.id,
      username: follow.user.username,
      displayName: follow.user.displayName,
      userImage: follow.user.userImage,
    });
  }
  return savers;
}

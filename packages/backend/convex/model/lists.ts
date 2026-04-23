import type { QueryCtx } from "../_generated/server";

export async function getViewableListIds(
  ctx: QueryCtx,
  lists: { id: string; userId: string; visibility: string }[],
  viewerId: string | null,
): Promise<Set<string>> {
  const viewableIds = new Set<string>();
  const privateListsToCheck: string[] = [];

  for (const list of lists) {
    if (list.visibility === "public" || list.visibility === "unlisted") {
      viewableIds.add(list.id);
      continue;
    }
    if (viewerId && list.userId === viewerId) {
      viewableIds.add(list.id);
      continue;
    }
    if (viewerId) {
      privateListsToCheck.push(list.id);
    }
  }

  if (viewerId && privateListsToCheck.length > 0) {
    const memberships = await Promise.all(
      privateListsToCheck.map((listId) =>
        ctx.db
          .query("listMembers")
          .withIndex("by_list_and_user", (q) =>
            q.eq("listId", listId).eq("userId", viewerId),
          )
          .first(),
      ),
    );
    privateListsToCheck.forEach((listId, i) => {
      if (memberships[i]) viewableIds.add(listId);
    });
  }

  return viewableIds;
}

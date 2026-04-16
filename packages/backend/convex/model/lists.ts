import type { QueryCtx } from "../_generated/server";

/**
 * Determine which of the given lists the current viewer is allowed to see.
 *
 * Mirrors the access rules used elsewhere (see `lists.checkListAccess` and
 * `feedHelpers.canUserViewListForFeed`): public/unlisted lists are visible
 * to anyone; private lists only to their owner or to a member.
 *
 * IMPORTANT: This is the single source of truth for what lists a viewer may
 * know about. The result is used to strip private-unviewable lists from
 * `event.lists` before it's returned to any client, in both feed queries
 * (feeds.ts) and the list-detail query (lists.ts `getEventsForList`). The
 * `SavedByModal` on the client explicitly trusts the server's filtering —
 * every code path that populates `event.lists` MUST pass it through here.
 */
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
    // Private list — viewer must be owner or a member to see it.
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

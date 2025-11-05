import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { internalAction } from "./_generated/server";

export const listUsersForBackfill = internalAction({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        id: v.string(),
        email: v.string(),
        username: v.string(),
      }),
    ),
    continueCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const users: {
      page: Doc<"users">[];
      continueCursor: string | null;
      isDone: boolean;
    } = await ctx.runQuery(api.users.getAllUsersPaginated, {
      paginationOpts: args.paginationOpts,
    });

    const mappedUsers = users.page.map((user: Doc<"users">) => ({
      id: user.id,
      email: user.email,
      username: user.username,
    }));

    return {
      page: mappedUsers,
      continueCursor: users.continueCursor,
      isDone: users.isDone,
    };
  },
});

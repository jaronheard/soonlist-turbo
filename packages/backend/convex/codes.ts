import { v } from "convex/values";

import { action } from "./_generated/server";

export const redeemCode = action({
  args: {
    code: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { code }) => {
    const normalized = code.trim().toUpperCase();
    const validCode = "DISCOVER";
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      if (normalized === validCode) {
        return { success: true };
      } else {
        return { success: false, error: "Invalid code" };
      }
    }

    try {
      const clerkEndpoint =
        process.env.CLERK_API_ENDPOINT || "https://api.clerk.dev/v1";
      const secretKey = process.env.CLERK_SECRET_KEY;

      if (!secretKey) {
        console.error("Missing CLERK_SECRET_KEY");
        return { success: false, error: "Configuration error" };
      }

      if (normalized !== validCode) {
        return { success: false, error: "Invalid code" };
      }

      const response = await fetch(
        `${clerkEndpoint}/users/${identity.subject}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            public_metadata: {
              showDiscover: true,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to update Clerk metadata: ${response.status} ${response.statusText} — ${errorText}`,
        );
        return { success: false, error: "Failed to update user access" };
      }

      return { success: true };
    } catch (error) {
      console.error("Error redeeming code:", error);
      return { success: false, error: "Something went wrong" };
    }
  },
});

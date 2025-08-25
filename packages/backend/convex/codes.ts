import { v } from "convex/values";

import { action } from "./_generated/server";

/**
 * Redeem a code to enable discover access
 * This action updates the user's public metadata via Clerk
 */
export const redeemCode = action({
  args: {
    code: v.string(),
  },
  handler: async (ctx, { code }) => {
    // Check if user is authenticated
    const identity = await ctx.auth.getUserIdentity();

    // For anonymous users, store the code redemption in their guest data
    // This will be transferred when they sign up
    if (!identity) {
      // Only support the "DISCOVER" code
      const validCode = "DISCOVER";

      if (code.toUpperCase() === validCode) {
        // Store in localStorage or AsyncStorage for anonymous users
        // This will be picked up during signup
        return { success: true };
      } else {
        return { success: false, error: "Invalid code" };
      }
    }

    // For authenticated users, update their Clerk metadata directly
    try {
      // Make HTTP request to update Clerk user metadata
      const clerkEndpoint =
        process.env.CLERK_API_ENDPOINT || "https://api.clerk.dev/v1";
      const secretKey = process.env.CLERK_SECRET_KEY;

      if (!secretKey) {
        console.error("Missing CLERK_SECRET_KEY");
        return { success: false, error: "Configuration error" };
      }

      // Only support the "DISCOVER" code
      const validCode = "DISCOVER";

      if (code.toUpperCase() !== validCode) {
        return { success: false, error: "Invalid code" };
      }

      // Update user's public metadata
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
        console.error("Failed to update Clerk metadata:", errorText);
        return { success: false, error: "Failed to update user access" };
      }

      return { success: true };
    } catch (error) {
      console.error("Error redeeming code:", error);
      return { success: false, error: "Something went wrong" };
    }
  },
});

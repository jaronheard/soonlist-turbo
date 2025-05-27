import { v } from "convex/values";

import { internalAction } from "./_generated/server";
import * as AI from "./model/ai";

/**
 * Upload base64 image to CDN
 */
export const uploadImage = internalAction({
  args: {
    base64Image: v.string(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    // TODO: Implement image upload logic from model/ai.ts
    // This will call AI.uploadImageToCDNFromBase64
    return null; // Stub return
  },
});

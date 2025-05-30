import { ConvexError, v } from "convex/values";

import { internalAction } from "./_generated/server";
import * as Files from "./model/files";

/**
 * Upload base64 image to CDN
 */
export const uploadImage = internalAction({
  args: {
    base64Image: v.string(),
  },
  returns: v.string(),
  handler: async (_, args) => {
    try {
      const result = await Files.uploadImageToCDNFromBase64(args.base64Image);
      if (!result) {
        throw new ConvexError("Failed to upload image to CDN");
      }
      return result;
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to upload image to CDN");
    }
  },
});

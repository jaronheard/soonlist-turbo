import { v } from "convex/values";

import { internalAction } from "./_generated/server";
import * as Files from "./model/files";

/**
 * Upload base64 image to CDN
 */
export const uploadImage = internalAction({
  args: {
    base64Image: v.string(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (_, args) => {
    return await Files.uploadImageToCDNFromBase64(args.base64Image);
  },
});

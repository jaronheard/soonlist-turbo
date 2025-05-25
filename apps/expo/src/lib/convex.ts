import { ConvexReactClient } from "convex/react";

import Config from "~/utils/config";

export const convex = new ConvexReactClient(Config.convexUrl);

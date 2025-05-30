// convex/convex.config.ts
import workflow from "@convex-dev/workflow/convex.config";
import workpool from "@convex-dev/workpool/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(workflow);
app.use(workpool, { name: "eventIngestionWorkpool" });
export default app;

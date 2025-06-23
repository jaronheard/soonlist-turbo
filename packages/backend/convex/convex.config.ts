// convex/convex.config.ts
import migrations from "@convex-dev/migrations/convex.config";
import workflow from "@convex-dev/workflow/convex.config";
import workpool from "@convex-dev/workpool/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(workflow);
app.use(workpool, { name: "eventIngestionWorkpool" });
app.use(migrations);
export default app;

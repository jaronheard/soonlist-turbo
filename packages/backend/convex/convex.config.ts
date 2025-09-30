// convex/convex.config.ts
import aggregate from "@convex-dev/aggregate/convex.config";
import migrations from "@convex-dev/migrations/convex.config";
import workflow from "@convex-dev/workflow/convex.config";
import workpool from "@convex-dev/workpool/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(workflow);
app.use(workpool, { name: "eventIngestionWorkpool" });
app.use(migrations);

// Aggregates for efficient stats calculations
app.use(aggregate, { name: "eventsByCreation" }); // For capturesThisWeek
app.use(aggregate, { name: "eventsByStartTime" }); // For upcomingEvents (own only)
app.use(aggregate, { name: "eventFollowsAggregate" }); // For follow counts
app.use(aggregate, { name: "userFeedsAggregate" }); // For upcoming events (own + followed)

export default app;

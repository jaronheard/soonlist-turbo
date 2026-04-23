import aggregate from "@convex-dev/aggregate/convex.config";
import migrations from "@convex-dev/migrations/convex.config";
import workflow from "@convex-dev/workflow/convex.config";
import workpool from "@convex-dev/workpool/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(workflow);
app.use(workpool, { name: "eventIngestionWorkpool" });
app.use(migrations);

app.use(aggregate, { name: "eventsByCreation" });
app.use(aggregate, { name: "eventsByStartTime" });
app.use(aggregate, { name: "eventFollowsAggregate" });
app.use(aggregate, { name: "userFeedsAggregate" });
app.use(aggregate, { name: "listFollowsAggregate" });

export default app;

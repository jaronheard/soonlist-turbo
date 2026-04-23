import { TableAggregate } from "@convex-dev/aggregate";

import type { DataModel } from "./_generated/dataModel";
import { components } from "./_generated/api";

export const eventsByCreation = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: "events";
}>(components.eventsByCreation, {
  namespace: (doc) => doc.userId,
  sortKey: (doc) => new Date(doc.created_at).getTime(),
});

export const eventsByStartTime = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: "events";
}>(components.eventsByStartTime, {
  namespace: (doc) => doc.userId,
  sortKey: (doc) => new Date(doc.startDateTime).getTime(),
});

export const eventFollowsAggregate = new TableAggregate<{
  Namespace: string;
  Key: null;
  DataModel: DataModel;
  TableName: "eventFollows";
}>(components.eventFollowsAggregate, {
  namespace: (doc) => doc.userId,
  sortKey: () => null,
});

export const userFeedsAggregate = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: "userFeeds";
}>(components.userFeedsAggregate, {
  namespace: (doc) => doc.feedId,
  sortKey: (doc) => (doc.hasEnded ? 1 : 0),
});

export const listFollowsAggregate = new TableAggregate<{
  Namespace: string;
  Key: null;
  DataModel: DataModel;
  TableName: "listFollows";
}>(components.listFollowsAggregate, {
  namespace: (doc) => doc.listId,
  sortKey: () => null,
});

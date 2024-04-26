import {
  mysqlTable,
  index,
  primaryKey,
  varchar,
  mediumtext,
  datetime,
  json,
  mysqlEnum,
  int,
  unique,
  timestamp,
  serial,
} from "drizzle-orm/mysql-core";
import { relations, sql } from "drizzle-orm";

// note about the table names here -- they are all not pluralized because that's how i set them up AND
// i'm running into a bug when i try to rename and push the changes to planetscale

export const comments = mysqlTable(
  "Comments",
  {
    id: serial("id").primaryKey(),
    content: mediumtext("content").notNull(),
    eventId: varchar("eventId", { length: 191 }).notNull(),
    userId: varchar("userId", { length: 191 }).notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt").onUpdateNow(),
    oldId: varchar("oldId", { length: 191 }), // this is for the migration
  },
  (table) => {
    return {
      eventIdIdx: index("Comments_eventId_idx").on(table.eventId),
      userIdIdx: index("Comments_userId_idx").on(table.userId),
    };
  }
);

export const commentsRelations = relations(comments, ({ one }) => ({
  event: one(events, { fields: [comments.eventId], references: [events.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}));

export const events = mysqlTable(
  "Events",
  {
    id: varchar("id", { length: 25 }).unique().notNull().primaryKey(),
    userId: varchar("userId", { length: 191 }).notNull(),
    userName: varchar("userName", { length: 64 }).notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt").onUpdateNow(),
    event: json("event").notNull(),
    eventMetadata: json("eventMetadata"),
    endDateTime: datetime("endDateTime", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    startDateTime: datetime("startDateTime", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    visibility: mysqlEnum("visibility", ["public", "private"])
      .default("public")
      .notNull(),
  },
  (table) => {
    return {
      userIdIdx: index("Events_userId_idx").on(table.userId),
    };
  }
);

export const eventsRelations = relations(events, ({ one, many }) => ({
  user: one(users, { fields: [events.userId], references: [users.id] }),
  eventToLists: many(eventToLists),
  comments: many(comments),
  eventFollows: many(eventFollows),
}));

export const eventToLists = mysqlTable(
  "EventToLists",
  {
    eventId: varchar("eventId", { length: 191 }).notNull(),
    listId: varchar("listId", { length: 191 }).notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.eventId, table.listId] }),
    };
  }
);

export const eventToListsRelations = relations(eventToLists, ({ one }) => ({
  event: one(events, {
    fields: [eventToLists.eventId],
    references: [events.id],
  }),
  list: one(lists, { fields: [eventToLists.listId], references: [lists.id] }),
}));

export const eventFollows = mysqlTable(
  "EventFollows",
  {
    userId: varchar("userId", { length: 191 }).notNull(),
    eventId: varchar("eventId", { length: 191 }).notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.eventId] }),
    };
  }
);

export const eventFollowsRelations = relations(eventFollows, ({ one }) => ({
  user: one(users, {
    fields: [eventFollows.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [eventFollows.eventId],
    references: [events.id],
  }),
}));

export const listFollows = mysqlTable(
  "ListFollows",
  {
    userId: varchar("userId", { length: 191 }).notNull(),
    listId: varchar("listId", { length: 191 }).notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.listId] }),
    };
  }
);

export const listFollowsRelations = relations(listFollows, ({ one }) => ({
  user: one(users, { fields: [listFollows.userId], references: [users.id] }),
  list: one(lists, { fields: [listFollows.listId], references: [lists.id] }),
}));

export const userFollows = mysqlTable(
  "UserFollows",
  {
    followerId: varchar("followerId", { length: 191 }).notNull(),
    followingId: varchar("followingId", { length: 191 }).notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.followerId, table.followingId] }),
    };
  }
);

export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  follower: one(users, {
    fields: [userFollows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  following: one(users, {
    fields: [userFollows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

export const lists = mysqlTable(
  "Lists",
  {
    id: varchar("id", { length: 191 }).notNull().primaryKey(),
    userId: varchar("userId", { length: 191 }).notNull(),
    name: varchar("name", { length: 191 }).notNull(),
    description: varchar("description", { length: 191 }).notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt").onUpdateNow(),
  },
  (table) => {
    return {
      userIdIdx: index("List_userId_idx").on(table.userId),
    };
  }
);

export const listsRelations = relations(lists, ({ one, many }) => ({
  user: one(users, { fields: [lists.userId], references: [users.id] }),
  eventToLists: many(eventToLists),
  listFollows: many(listFollows),
}));

export const requestResponses = mysqlTable(
  "RequestResponses",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt").onUpdateNow(),
    modelOutput: json("modelOutput"),
    modelInput: json("modelInput").notNull(),
    modelStatus: varchar("modelStatus", { length: 191 })
      .default("idle")
      .notNull(),
    source: varchar("source", { length: 191 }).default("unknown").notNull(),
    modelCompletionTime: int("modelCompletionTime"),
    parsedOutput: json("parsedOutput"),
  },
  (table) => {
    return {};
  }
);

export const users = mysqlTable(
  "Users",
  {
    id: varchar("id", { length: 191 }).notNull().primaryKey(),
    username: varchar("username", { length: 64 }).notNull(),
    email: varchar("email", { length: 191 }).notNull(),
    displayName: varchar("displayName", { length: 191 }).notNull(),
    userImage: varchar("userImage", { length: 191 }).notNull(),
    bio: varchar("bio", { length: 150 }), // same as instagram
    publicEmail: varchar("publicEmail", { length: 254 }), // per RFC 5321
    publicPhone: varchar("publicPhone", { length: 20 }), // per E.123
    publicInsta: varchar("publicInsta", { length: 31 }), // per instagram
    publicWebsite: varchar("publicWebsite", { length: 2083 }), // per internet explorer max url length
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt").onUpdateNow(),
  },
  (table) => {
    return {
      userUsernameKey: unique("Users_username_key").on(table.username),
      userEmailKey: unique("Users_email_key").on(table.email),
    };
  }
);

export const usersRelations = relations(users, ({ one, many }) => ({
  events: many(events),
  eventFollows: many(eventFollows),
  listFollows: many(listFollows),
  followers: many(userFollows, { relationName: "follower" }),
  following: many(userFollows, { relationName: "following" }),
  lists: many(lists),
}));

export const waitlistSubmissions = mysqlTable(
  "WaitlistSubmissions",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 191 }).notNull().unique(),
    zipcode: varchar("zipcode", { length: 191 }).notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt").onUpdateNow(),
    why: varchar("why", { length: 191 }).notNull(),
  },
  (table) => {
    return {};
  }
);

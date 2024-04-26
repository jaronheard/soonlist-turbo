import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import {
  type comments,
  type eventToLists,
  type events,
  type eventFollows,
  type listFollows,
  type userFollows,
  type lists,
  requestResponses,
  type users,
} from "./schema";

export type Comment = InferSelectModel<typeof comments>;
export type NewComment = InferInsertModel<typeof comments>;
export type UpdateComment = Partial<InferInsertModel<typeof comments>>;

export type Event = InferSelectModel<typeof events>;
export type NewEvent = InferInsertModel<typeof events>;
export type UpdateEvent = Partial<InferInsertModel<typeof events>>;

export type EventFollow = InferSelectModel<typeof eventFollows>;
export type NewEventFollow = InferInsertModel<typeof eventFollows>;
export type UpdateEventFollow = Partial<InferInsertModel<typeof eventFollows>>;

export type ListFollow = InferSelectModel<typeof listFollows>;
export type NewListFollow = InferInsertModel<typeof listFollows>;
export type UpdateListFollow = Partial<InferInsertModel<typeof listFollows>>;

export type UserFollow = InferSelectModel<typeof userFollows>;
export type NewUserFollow = InferInsertModel<typeof userFollows>;
export type UpdateUserFollow = Partial<InferInsertModel<typeof userFollows>>;

export type List = InferSelectModel<typeof lists>;
export type NewList = InferInsertModel<typeof lists>;
export type UpdateList = Partial<InferInsertModel<typeof lists>>;

export type RequestResponse = InferSelectModel<typeof requestResponses>;
export type NewRequestResponse = InferInsertModel<typeof requestResponses>;
export type UpdateRequestResponse = Partial<
  InferInsertModel<typeof requestResponses>
>;
export const insertRequestResponseSchema = createInsertSchema(requestResponses);

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type UpdateUser = Partial<InferInsertModel<typeof users>>;

export type EventToLists = InferSelectModel<typeof eventToLists>;
export type NewEventToLists = InferInsertModel<typeof eventToLists>;
export type UpdateEventToLists = Partial<InferInsertModel<typeof eventToLists>>;

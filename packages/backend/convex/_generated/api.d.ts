/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai from "../ai.js";
import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as model_ai from "../model/ai.js";
import type * as model_events from "../model/events.js";
import type * as model_notifications from "../model/notifications.js";
import type * as model_oneSignal from "../model/oneSignal.js";
import type * as notifications from "../notifications.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  crons: typeof crons;
  events: typeof events;
  "model/ai": typeof model_ai;
  "model/events": typeof model_events;
  "model/notifications": typeof model_notifications;
  "model/oneSignal": typeof model_oneSignal;
  notifications: typeof notifications;
  users: typeof users;
  utils: typeof utils;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

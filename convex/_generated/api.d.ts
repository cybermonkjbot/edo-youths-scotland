/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as blogPosts from "../blogPosts.js";
import type * as governanceProfiles from "../governanceProfiles.js";
import type * as http from "../http.js";
import type * as impactReports from "../impactReports.js";
import type * as joinRequests from "../joinRequests.js";
import type * as members from "../members.js";
import type * as partners from "../partners.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  blogPosts: typeof blogPosts;
  governanceProfiles: typeof governanceProfiles;
  http: typeof http;
  impactReports: typeof impactReports;
  joinRequests: typeof joinRequests;
  members: typeof members;
  partners: typeof partners;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  admins: defineTable({
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
    passwordSalt: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  adminSessions: defineTable({
    adminId: v.id("admins"),
    tokenHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_admin", ["adminId"]),

  joinRequests: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    interest: v.string(),
    location: v.optional(v.string()),
    message: v.optional(v.string()),
    profilePhotoName: v.optional(v.string()),
    profilePhotoType: v.optional(v.string()),
    profilePhotoSize: v.optional(v.number()),
    status: v.union(v.literal("new"), v.literal("reviewed"), v.literal("archived")),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_status_created", ["status", "createdAt"])
    .index("by_created", ["createdAt"]),

  members: defineTable({
    name: v.string(),
    role: v.string(),
    location: v.optional(v.string()),
    bio: v.string(),
    skills: v.array(v.string()),
    businessName: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    sourceJoinRequestId: v.optional(v.id("joinRequests")),
    visibility: v.union(v.literal("draft"), v.literal("public"), v.literal("hidden")),
    createdAt: v.number(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_visibility_published", ["visibility", "publishedAt"])
    .index("by_created", ["createdAt"]),

  blogPosts: defineTable({
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    body: v.string(),
    coverImageUrl: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("published")),
    authorId: v.optional(v.id("admins")),
    createdAt: v.number(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_status_published", ["status", "publishedAt"]),
});

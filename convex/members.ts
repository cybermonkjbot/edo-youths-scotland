import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

const visibilityValidator = v.union(v.literal("draft"), v.literal("public"), v.literal("hidden"));

async function digest(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function requireAdmin(ctx: any, sessionToken: string) {
  const tokenHash = await digest(sessionToken);
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_token_hash", (q: any) => q.eq("tokenHash", tokenHash))
    .unique();

  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Admin session expired. Please sign in again.");
  }

  const admin = await ctx.db.get(session.adminId);
  if (!admin || !admin.active) {
    throw new Error("Admin account is not active.");
  }

  return admin;
}

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function skillList(value?: string) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function inferRole(interest: string) {
  const lower = interest.toLowerCase();
  if (lower.includes("mentor")) return "Mentor";
  if (lower.includes("volunteer")) return "Volunteer";
  if (lower.includes("business") || lower.includes("talent")) return "Member business";
  if (lower.includes("partner")) return "Community partner";
  return "Member";
}

export const listPublic = queryGeneric({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("members")
      .withIndex("by_visibility_published", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(100);
  },
});

export const listForAdmin = queryGeneric({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    return await ctx.db.query("members").withIndex("by_created").order("desc").take(100);
  },
});

export const create = mutationGeneric({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    role: v.string(),
    location: v.optional(v.string()),
    bio: v.string(),
    skills: v.optional(v.string()),
    businessName: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    visibility: visibilityValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const now = Date.now();
    const name = args.name.trim();
    const role = args.role.trim();
    const bio = args.bio.trim();

    if (!name || !role || !bio) {
      throw new Error("Name, role and bio are required.");
    }

    const id = await ctx.db.insert("members", {
      name,
      role,
      location: clean(args.location),
      bio,
      skills: skillList(args.skills),
      businessName: clean(args.businessName),
      websiteUrl: clean(args.websiteUrl),
      imageUrl: clean(args.imageUrl),
      visibility: args.visibility,
      createdAt: now,
      updatedAt: now,
      publishedAt: args.visibility === "public" ? now : undefined,
    });

    return { ok: true, id };
  },
});

export const createFromJoinRequest = mutationGeneric({
  args: {
    sessionToken: v.string(),
    id: v.id("joinRequests"),
    role: v.optional(v.string()),
    bio: v.optional(v.string()),
    skills: v.optional(v.string()),
    businessName: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    visibility: visibilityValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error("Join request not found.");
    }

    const now = Date.now();
    const role = clean(args.role) || inferRole(request.interest);
    const bio =
      clean(args.bio) ||
      clean(request.message) ||
      `${request.name} is part of the Edo Youths Scotland community.`;

    const memberId = await ctx.db.insert("members", {
      name: request.name,
      role,
      location: clean(request.location),
      bio,
      skills: skillList(args.skills || request.interest),
      businessName: clean(args.businessName),
      websiteUrl: clean(args.websiteUrl),
      imageUrl: clean(args.imageUrl),
      sourceJoinRequestId: request._id,
      visibility: args.visibility,
      createdAt: now,
      updatedAt: now,
      publishedAt: args.visibility === "public" ? now : undefined,
    });

    await ctx.db.patch(request._id, {
      status: "reviewed",
      reviewedAt: now,
    });

    return { ok: true, id: memberId };
  },
});

export const update = mutationGeneric({
  args: {
    sessionToken: v.string(),
    id: v.id("members"),
    name: v.string(),
    role: v.string(),
    location: v.optional(v.string()),
    bio: v.string(),
    skills: v.optional(v.string()),
    businessName: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    visibility: visibilityValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Member profile not found.");
    }

    const now = Date.now();
    const name = args.name.trim();
    const role = args.role.trim();
    const bio = args.bio.trim();

    if (!name || !role || !bio) {
      throw new Error("Name, role and bio are required.");
    }

    await ctx.db.patch(args.id, {
      name,
      role,
      location: clean(args.location),
      bio,
      skills: skillList(args.skills),
      businessName: clean(args.businessName),
      websiteUrl: clean(args.websiteUrl),
      imageUrl: clean(args.imageUrl),
      visibility: args.visibility,
      updatedAt: now,
      publishedAt: args.visibility === "public" ? existing.publishedAt || now : undefined,
    });

    return { ok: true };
  },
});

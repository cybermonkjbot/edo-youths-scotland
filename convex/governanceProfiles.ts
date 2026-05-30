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

export const listPublic = queryGeneric({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("governanceProfiles")
      .withIndex("by_visibility_sort", (q) => q.eq("visibility", "public"))
      .order("asc")
      .take(50);
  },
});

export const listForAdmin = queryGeneric({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    return await ctx.db.query("governanceProfiles").withIndex("by_created").order("desc").take(100);
  },
});

export const create = mutationGeneric({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    role: v.string(),
    bio: v.string(),
    imageUrl: v.optional(v.string()),
    sortOrder: v.number(),
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

    const id = await ctx.db.insert("governanceProfiles", {
      name,
      role,
      bio,
      imageUrl: clean(args.imageUrl),
      sortOrder: Number.isFinite(args.sortOrder) ? args.sortOrder : 100,
      visibility: args.visibility,
      createdAt: now,
      updatedAt: now,
      publishedAt: args.visibility === "public" ? now : undefined,
    });

    return { ok: true, id };
  },
});

export const update = mutationGeneric({
  args: {
    sessionToken: v.string(),
    id: v.id("governanceProfiles"),
    name: v.string(),
    role: v.string(),
    bio: v.string(),
    imageUrl: v.optional(v.string()),
    sortOrder: v.number(),
    visibility: visibilityValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Governance profile not found.");
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
      bio,
      imageUrl: clean(args.imageUrl),
      sortOrder: Number.isFinite(args.sortOrder) ? args.sortOrder : 100,
      visibility: args.visibility,
      updatedAt: now,
      publishedAt: args.visibility === "public" ? existing.publishedAt || now : undefined,
    });

    return { ok: true };
  },
});

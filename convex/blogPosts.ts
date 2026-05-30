import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

const statusValidator = v.union(v.literal("draft"), v.literal("published"));

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

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

async function uniqueSlug(ctx: any, title: string, currentId?: string) {
  const base = slugify(title) || `post-${Date.now()}`;
  let slug = base;
  let suffix = 2;

  while (true) {
    const existing = await ctx.db
      .query("blogPosts")
      .withIndex("by_slug", (q: any) => q.eq("slug", slug))
      .unique();

    if (!existing || existing._id === currentId) {
      return slug;
    }

    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

export const listPublic = queryGeneric({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("blogPosts")
      .withIndex("by_status_published", (q) => q.eq("status", "published"))
      .order("desc")
      .take(50);
  },
});

export const getPublicBySlug = queryGeneric({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("blogPosts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!post || post.status !== "published") {
      return null;
    }

    return post;
  },
});

export const listForAdmin = queryGeneric({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    return await ctx.db.query("blogPosts").order("desc").take(100);
  },
});

export const create = mutationGeneric({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    excerpt: v.string(),
    body: v.string(),
    coverImageUrl: v.optional(v.string()),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken);
    const now = Date.now();
    const title = args.title.trim();
    const body = args.body.trim();
    const excerpt = args.excerpt.trim();

    if (!title || !body || !excerpt) {
      throw new Error("Title, excerpt and body are required.");
    }

    const id = await ctx.db.insert("blogPosts", {
      title,
      slug: await uniqueSlug(ctx, title),
      excerpt,
      body,
      coverImageUrl: clean(args.coverImageUrl),
      status: args.status,
      authorId: admin.adminId,
      createdAt: now,
      updatedAt: now,
      publishedAt: args.status === "published" ? now : undefined,
    });

    return { ok: true, id };
  },
});

export const update = mutationGeneric({
  args: {
    sessionToken: v.string(),
    id: v.id("blogPosts"),
    title: v.string(),
    excerpt: v.string(),
    body: v.string(),
    coverImageUrl: v.optional(v.string()),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const existing = await ctx.db.get(args.id);

    if (!existing) {
      throw new Error("Blog post not found.");
    }

    const now = Date.now();
    const title = args.title.trim();
    const body = args.body.trim();
    const excerpt = args.excerpt.trim();

    if (!title || !body || !excerpt) {
      throw new Error("Title, excerpt and body are required.");
    }

    await ctx.db.patch(args.id, {
      title,
      slug: await uniqueSlug(ctx, title, args.id),
      excerpt,
      body,
      coverImageUrl: clean(args.coverImageUrl),
      status: args.status,
      updatedAt: now,
      publishedAt: args.status === "published" ? existing.publishedAt || now : undefined,
    });

    return { ok: true };
  },
});

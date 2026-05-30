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

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function highlightList(value?: string) {
  return (value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export const listPublic = queryGeneric({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("impactReports")
      .withIndex("by_status_published", (q) => q.eq("status", "published"))
      .order("desc")
      .take(20);
  },
});

export const listForAdmin = queryGeneric({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    return await ctx.db.query("impactReports").withIndex("by_created").order("desc").take(100);
  },
});

export const create = mutationGeneric({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    period: v.string(),
    summary: v.string(),
    body: v.string(),
    metricHighlights: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const now = Date.now();
    const title = args.title.trim();
    const period = args.period.trim();
    const summary = args.summary.trim();
    const body = args.body.trim();

    if (!title || !period || !summary || !body) {
      throw new Error("Title, period, summary and body are required.");
    }

    const id = await ctx.db.insert("impactReports", {
      title,
      period,
      summary,
      body,
      metricHighlights: highlightList(args.metricHighlights),
      fileUrl: clean(args.fileUrl),
      status: args.status,
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
    id: v.id("impactReports"),
    title: v.string(),
    period: v.string(),
    summary: v.string(),
    body: v.string(),
    metricHighlights: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Impact report not found.");
    }

    const now = Date.now();
    const title = args.title.trim();
    const period = args.period.trim();
    const summary = args.summary.trim();
    const body = args.body.trim();

    if (!title || !period || !summary || !body) {
      throw new Error("Title, period, summary and body are required.");
    }

    await ctx.db.patch(args.id, {
      title,
      period,
      summary,
      body,
      metricHighlights: highlightList(args.metricHighlights),
      fileUrl: clean(args.fileUrl),
      status: args.status,
      updatedAt: now,
      publishedAt: args.status === "published" ? existing.publishedAt || now : undefined,
    });

    return { ok: true };
  },
});

import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

const optionalString = v.optional(v.string());

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

export const submit = mutationGeneric({
  args: {
    name: v.string(),
    email: v.string(),
    phone: optionalString,
    interest: v.string(),
    location: optionalString,
    message: optionalString,
    profilePhotoName: optionalString,
    profilePhotoType: optionalString,
    profilePhotoSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const email = args.email.trim().toLowerCase();
    const interest = args.interest.trim();

    if (!name || !email || !interest) {
      throw new Error("Name, email and interest are required.");
    }

    const id = await ctx.db.insert("joinRequests", {
      name,
      email,
      phone: clean(args.phone),
      interest,
      location: clean(args.location),
      message: clean(args.message),
      profilePhotoName: clean(args.profilePhotoName),
      profilePhotoType: clean(args.profilePhotoType),
      profilePhotoSize: args.profilePhotoSize,
      status: "new",
      createdAt: Date.now(),
    });

    return { ok: true, id };
  },
});

export const listForAdmin = queryGeneric({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    return await ctx.db.query("joinRequests").withIndex("by_created").order("desc").take(100);
  },
});

export const updateStatus = mutationGeneric({
  args: {
    sessionToken: v.string(),
    id: v.id("joinRequests"),
    status: v.union(v.literal("new"), v.literal("reviewed"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    await ctx.db.patch(args.id, {
      status: args.status,
      reviewedAt: args.status === "new" ? undefined : Date.now(),
    });
    return { ok: true };
  },
});

import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

declare const process: {
  env: Record<string, string | undefined>;
};

const SESSION_DAYS = 7;

async function digest(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function randomToken(bytes = 32) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password: string, salt: string) {
  return digest(`${salt}:${password}`);
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

export const bootstrap = mutationGeneric({
  args: {
    bootstrapToken: v.string(),
  },
  handler: async (ctx, args) => {
    const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || "EYS Admin";

    if (!expectedToken || args.bootstrapToken !== expectedToken) {
      throw new Error("Bootstrap token is missing or invalid.");
    }

    if (!email || !password) {
      throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before bootstrapping.");
    }

    const now = Date.now();
    const normalizedEmail = normalizeEmail(email);
    const passwordSalt = randomToken(16);
    const passwordHash = await hashPassword(password, passwordSalt);
    const existing = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        passwordHash,
        passwordSalt,
        active: true,
        updatedAt: now,
      });
      return { ok: true, email: normalizedEmail, updated: true };
    }

    await ctx.db.insert("admins", {
      email: normalizedEmail,
      name,
      passwordHash,
      passwordSalt,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true, email: normalizedEmail, updated: false };
  },
});

export const login = mutationGeneric({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", normalizeEmail(args.email)))
      .unique();

    if (!admin || !admin.active) {
      throw new Error("Invalid email or password.");
    }

    const passwordHash = await hashPassword(args.password, admin.passwordSalt);
    if (passwordHash !== admin.passwordHash) {
      throw new Error("Invalid email or password.");
    }

    const token = randomToken(32);
    await ctx.db.insert("adminSessions", {
      adminId: admin._id,
      tokenHash: await digest(token),
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
    });

    return {
      token,
      admin: {
        email: admin.email,
        name: admin.name,
      },
    };
  },
});

export const logout = mutationGeneric({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const tokenHash = await digest(args.sessionToken);
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { ok: true };
  },
});

export const me = queryGeneric({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken);
    return {
      email: admin.email,
      name: admin.name,
    };
  },
});

export const assertAdmin = queryGeneric({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken);
    return {
      adminId: admin._id,
      email: admin.email,
      name: admin.name,
    };
  },
});

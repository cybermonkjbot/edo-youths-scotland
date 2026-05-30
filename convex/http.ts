import { httpActionGeneric, httpRouter, makeFunctionReference } from "convex/server";

const http = httpRouter();
const functions = {
  adminLogin: makeFunctionReference<"mutation">("admin:login"),
  adminLogout: makeFunctionReference<"mutation">("admin:logout"),
  adminMe: makeFunctionReference<"query">("admin:me"),
  blogCreate: makeFunctionReference<"mutation">("blogPosts:create"),
  blogGetPublicBySlug: makeFunctionReference<"query">("blogPosts:getPublicBySlug"),
  blogListForAdmin: makeFunctionReference<"query">("blogPosts:listForAdmin"),
  blogListPublic: makeFunctionReference<"query">("blogPosts:listPublic"),
  blogUpdate: makeFunctionReference<"mutation">("blogPosts:update"),
  joinListForAdmin: makeFunctionReference<"query">("joinRequests:listForAdmin"),
  joinSubmit: makeFunctionReference<"mutation">("joinRequests:submit"),
  joinUpdateStatus: makeFunctionReference<"mutation">("joinRequests:updateStatus"),
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };
}

function errorResponse(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return json({ ok: false, error: message }, status);
}

function sessionTokenFrom(request: Request) {
  const authorization = request.headers.get("Authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
}

async function body(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

http.route({
  pathPrefix: "/api/",
  method: "OPTIONS",
  handler: httpActionGeneric(async () => new Response(null, { status: 204, headers: corsHeaders() })),
});

http.route({
  path: "/api/health",
  method: "GET",
  handler: httpActionGeneric(async () => json({ ok: true, service: "eys-convex" })),
});

http.route({
  path: "/api/join",
  method: "POST",
  handler: httpActionGeneric(async (ctx, request) => {
    try {
      const result = await ctx.runMutation(functions.joinSubmit, await body(request));
      return json(result);
    } catch (error) {
      return errorResponse(error);
    }
  }),
});

http.route({
  path: "/api/admin/login",
  method: "POST",
  handler: httpActionGeneric(async (ctx, request) => {
    try {
      const result = await ctx.runMutation(functions.adminLogin, await body(request));
      return json(result);
    } catch (error) {
      return errorResponse(error, 401);
    }
  }),
});

http.route({
  path: "/api/admin/logout",
  method: "POST",
  handler: httpActionGeneric(async (ctx, request) => {
    try {
      const result = await ctx.runMutation(functions.adminLogout, {
        sessionToken: sessionTokenFrom(request),
      });
      return json(result);
    } catch (error) {
      return errorResponse(error, 401);
    }
  }),
});

http.route({
  path: "/api/admin/me",
  method: "GET",
  handler: httpActionGeneric(async (ctx, request) => {
    try {
      const result = await ctx.runQuery(functions.adminMe, {
        sessionToken: sessionTokenFrom(request),
      });
      return json(result);
    } catch (error) {
      return errorResponse(error, 401);
    }
  }),
});

http.route({
  path: "/api/admin/join-requests",
  method: "GET",
  handler: httpActionGeneric(async (ctx, request) => {
    try {
      const result = await ctx.runQuery(functions.joinListForAdmin, {
        sessionToken: sessionTokenFrom(request),
      });
      return json(result);
    } catch (error) {
      return errorResponse(error, 401);
    }
  }),
});

http.route({
  path: "/api/admin/join-requests/status",
  method: "POST",
  handler: httpActionGeneric(async (ctx, request) => {
    try {
      const data = await body(request);
      const result = await ctx.runMutation(functions.joinUpdateStatus, {
        ...data,
        sessionToken: sessionTokenFrom(request),
      });
      return json(result);
    } catch (error) {
      return errorResponse(error, 401);
    }
  }),
});

http.route({
  path: "/api/admin/blog-posts",
  method: "GET",
  handler: httpActionGeneric(async (ctx, request) => {
    try {
      const result = await ctx.runQuery(functions.blogListForAdmin, {
        sessionToken: sessionTokenFrom(request),
      });
      return json(result);
    } catch (error) {
      return errorResponse(error, 401);
    }
  }),
});

http.route({
  path: "/api/admin/blog-posts",
  method: "POST",
  handler: httpActionGeneric(async (ctx, request) => {
    try {
      const data = await body(request);
      const result = await ctx.runMutation(functions.blogCreate, {
        ...data,
        sessionToken: sessionTokenFrom(request),
      });
      return json(result);
    } catch (error) {
      return errorResponse(error);
    }
  }),
});

http.route({
  path: "/api/admin/blog-posts/update",
  method: "POST",
  handler: httpActionGeneric(async (ctx, request) => {
    try {
      const data = await body(request);
      const result = await ctx.runMutation(functions.blogUpdate, {
        ...data,
        sessionToken: sessionTokenFrom(request),
      });
      return json(result);
    } catch (error) {
      return errorResponse(error);
    }
  }),
});

http.route({
  path: "/api/blog",
  method: "GET",
  handler: httpActionGeneric(async (ctx) => {
    try {
      const result = await ctx.runQuery(functions.blogListPublic, {});
      return json(result);
    } catch (error) {
      return errorResponse(error);
    }
  }),
});

http.route({
  pathPrefix: "/api/blog/",
  method: "GET",
  handler: httpActionGeneric(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const slug = decodeURIComponent(url.pathname.replace(/^\/api\/blog\//, ""));
      const result = await ctx.runQuery(functions.blogGetPublicBySlug, { slug });
      return result ? json(result) : json({ ok: false, error: "Post not found." }, 404);
    } catch (error) {
      return errorResponse(error);
    }
  }),
});

export default http;

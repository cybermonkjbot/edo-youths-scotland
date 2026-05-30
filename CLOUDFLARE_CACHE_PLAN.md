# Cloudflare Cache Plan

Goal: keep Azure Static Web Apps on the Free SKU and let Cloudflare absorb as much public traffic as possible.

## Current Cost Posture

- Azure frontend host: Static Web Apps Free SKU.
- No Azure Functions API is deployed with Static Web Apps.
- No App Service Plan, VM, Container Apps, Azure Front Door or Azure CDN resource is required.
- Convex serves the small backend API separately.

## Origin Headers

The repository includes `staticwebapp.config.json` so Azure returns cache headers Cloudflare can respect or override:

- `/assets/*`: `public, max-age=31536000, immutable`
- `/*.css` and `/*.js`: `public, max-age=604800, stale-while-revalidate=86400`
- `/*.html`: `public, max-age=300, stale-while-revalidate=3600`
- `/config.js`: short cache, because it points the frontend at the backend URL.

## Cloudflare Rules

Once the custom domain is on Cloudflare and proxied, use Cache Rules in this order:

1. **Static assets**
   - Match: URI path starts with `/assets/`
   - Cache eligibility: Eligible for cache
   - Edge TTL: 1 month or longer
   - Browser TTL: Respect origin headers

2. **CSS and JavaScript**
   - Match: URI path ends with `.css` or `.js`
   - Cache eligibility: Eligible for cache
   - Edge TTL: 7 days
   - Browser TTL: Respect origin headers

3. **Public HTML**
   - Match: URI path equals `/` or ends with `.html`
   - Exclude: `/admin.html` if you want admin edits to appear immediately
   - Cache eligibility: Eligible for cache
   - Edge TTL: 5 to 30 minutes
   - Browser TTL: Respect origin headers

4. **Bypass operational files**
   - Match: URI path equals `/config.js`
   - Cache eligibility: Bypass cache or use a very short Edge TTL such as 5 minutes

## Purge Habit

After each deployment, purge Cloudflare cache for:

- `/index.html`
- `/members.html`
- `/blog.html`
- `/impact.html`
- `/admin.html`
- `/config.js`

Assets can usually remain cached because they are static media and the JS/CSS files are requested with version query strings from the HTML.

## Avoid For Cost

- Do not enable Azure Static Web Apps enterprise-grade edge unless the site needs it. It requires the Standard plan and adds cost.
- Do not add Azure Front Door, Azure CDN or App Service unless there is a clear reason.
- Do not proxy Convex API calls through Azure just to make paths look neat; that would add moving parts and possible cost.

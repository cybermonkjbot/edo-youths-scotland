# Edo Youths Scotland CIC Agency

A small public website and lightweight admin app for Edo Youths Scotland CIC Agency.

The content and identity are rebuilt around the supplied EYS manifesto and logo documents:

- Name: Edo Youths Scotland CIC Agency
- Promise: Earn. Learn. Belong.
- Positioning: Edo-rooted. Scotland-connected. Future-focused.
- Core site sections: Story, Promise, Community, Agency, Members, Impact, Events, Blog, Join EYS

## App Pieces

- Public static pages: `index.html`, `community.html`, `members.html`, `impact.html`, `events.html`, `join.html`, `blog.html`
- Admin panel: `admin.html`
- Convex backend: `convex/`
- Azure Static Web App infrastructure: `infra/`

## Run

```bash
npm start
```

Then open `http://localhost:4173`.

## Backend

Create or connect a Convex deployment, then set the frontend URL in `config.js`.

```bash
cp .env.example .env
npm run convex:dev
```

Set these Convex environment variables before bootstrapping the first admin:

```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-long-random-password
ADMIN_NAME="EYS Admin"
ADMIN_BOOTSTRAP_TOKEN=replace-with-a-long-random-token
```

Then create or update the admin account:

```bash
npm run admin:bootstrap -- '{"bootstrapToken":"replace-with-a-long-random-token"}'
```

Use the generated Convex HTTP actions URL in `config.js`:

```js
window.EYS_CONFIG = {
  CONVEX_HTTP_URL: "https://your-convex-deployment.convex.site",
};
```

The join form submits to `/api/join`; the public blog reads `/api/blog`; the public member directory reads `/api/members`; the admin panel uses `/api/admin/*`.

Member profiles are separate from join requests. Join requests keep private contact details in the admin panel; only admin-approved member profiles appear on `members.html`.

## Azure

Provision the very small frontend host:

```bash
az group create --name rg-eys-prod --location westeurope
az deployment group create \
  --resource-group rg-eys-prod \
  --template-file infra/main.bicep \
  --parameters @infra/main.parameters.json
```

Add these GitHub repository secrets for CI/CD:

- `AZURE_STATIC_WEB_APPS_API_TOKEN`
- `CONVEX_HTTP_URL`

The workflow in `.github/workflows/deploy-azure.yml` writes `config.js` from the secret and deploys the static app.

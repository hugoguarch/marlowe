# Connections hub, more agent skills and tools, analytics via MCP, LinkedIn fix

## 1. LinkedIn fix (quick)
LinkedIn has retired the API version the app sends (September 2025). Move it to a current version and keep it in one setting, so next time it's a one-line change. You don't need a new token. You only reconnect if LinkedIn still refuses after this change.

## 2. Connections page (new look, like your references)
A new **Settings → Connections** page with a grid of app cards. Each card shows the app's logo, its name, who made it, a one-line description, a **Connect / Connected** button, a details button and an on/off switch. Filters at the top: All apps / Connected, a category menu, search, and a grid/list toggle.

Categories and the apps listed by default:
- **Email marketing:** Mailchimp, Instantly, Klaviyo, Brevo, ActiveCampaign
- **CRM & sales:** GoHighLevel (already connected), HubSpot
- **Social & scheduling:** Buffer, Metricool, Meta, LinkedIn, YouTube, TikTok
- **Productivity:** Notion, Slack, Google Drive/Sheets/Docs, Gmail, Google Calendar, Atlassian, Linear
- **Design:** Canva, Figma
- **Analytics:** Google Analytics, Search Console, PostHog, Semrush
- **Custom:** "Add your own MCP server" (any URL plus a key)

How each card connects:
- **Click to sign in:** where the app's MCP server supports sign-in (for example Notion, Linear, Atlassian, Canva, HubSpot), Connect opens a popup to log in.
- **API key:** for apps whose MCP server needs a key (for example Mailchimp, Instantly, Klaviyo), a short form asks for it. The key is stored only on the server.
- **Built-in:** Meta, Google, LinkedIn and YouTube keep using the sign-ins you already have. Their cards show the same status.
- Before setup I'll look up each provider's official MCP address. Any app without an official server shows "Coming soon", so I don't guess addresses.

## 3. Automations (like the sections you pasted)
An **Automations** tab inside the Agent with ready-made recipes you can turn on: monthly report on the 1st, weekly post ideas from your best videos, daily scheduled posts, a weekly email performance summary, and a new-reviews digest. Each recipe has an on/off switch, the client, the time and how often it repeats. "New automation" opens a short form, or you can just ask the agent.

## 4. Skills saved as .md files
- Built-in skills become separate markdown files in the codebase, one per playbook: posts, ideas, reports, websites, emails, email analytics, trend research, competitor check, repurposing videos into posts, and review replies.
- Your own skills can be imported or exported as `.md` files. Each file starts with its name and a short summary, followed by the instructions.

## 5. More agent tools
New built-in tools: email campaign stats, compare periods, best and worst posts, video retention summary, search performance, reviews summary, competitor snapshot (Semrush), repurpose a post, duplicate or edit a scheduled post, list automations and pause one. Any tool from a connected app is also available to the agent. Actions that change or send things in another app (posting, sending emails) always ask you to confirm first.

## 6. Analytics from connected apps
When a channel has no direct link but a connected app has the data (for example Mailchimp, Instantly or Metricool), the nightly sync pulls it in through that app's connection and saves it to the same place as the other channels. Charts and reports then use it automatically. A new **Email** section under Analytics shows opens, clicks, replies, bounces and unsubscribes as line graphs. Anything not connected shows N/A with a "Set up connection" button.

## 7. Prompt for the app
A ready-to-paste prompt for the in-app agent (saved as a skill and shown in chat) that explains the new tools, connections and automations, so it uses them without being told.

## Technical details
- LinkedIn: `VERSION` in `src/lib/pulse/linkedin.server.ts` moves to a current active month such as `202510`.
- Catalogue: `src/lib/agent/catalog.ts` lists each app with id, category, logo, auth type (`oauth` | `apikey` | `builtin` | `custom`), MCP URL and headers template. Connect flows reuse `agent_mcp_servers`, which gets new `catalog_id` and OAuth token columns. An MCP OAuth provider (`@ai-sdk/mcp` authProvider) adds a callback at `/api/public/mcp/oauth/callback` and stores tokens server-side only. SSRF guard for custom URLs.
- Skills: `src/lib/agent/skills/*.md` imported with `?raw` and frontmatter parsed. User skills stay in `agent_skills`, with .md import and export.
- Automations: reuse `agent_tasks` and add a `recipe` field. The hourly runner is unchanged.
- MCP metrics adapter: `src/lib/pulse/mcp-sync.server.ts` maps known MCP tool outputs into `pulse_metrics_daily` with `source='mcp'` and channel `email`. Runs inside the existing nightly sync.
- Confirm-before-write: remote tools without `readOnlyHint` use AI SDK `needsApproval`. Chat shows Approve / Decline.

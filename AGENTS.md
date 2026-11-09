<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Pulse lives inside the Why Media AI shell (src/routes/_authenticated/_shell, analytics under /marketing/analytics, old /pulse and /app URLs redirect); all reads go through src/lib/pulse/pulse.functions.ts and pure helpers in src/lib/pulse/metrics.ts, so live adapters only need to write the pulse_* tables (keeps sample and live data interchangeable).

- Pulse metrics carry a `site` column (part of the primary key) and connections are unique per client+provider+account, so a client can have several websites/accounts per channel; `pulse_series` takes an optional `_site` filter. Why: clients like CLS run multiple sites.
- Pulse nightly sync runs via pg_cron calling `/api/public/hooks/pulse-sync`, which only re-pulls provider data (idempotent). Why: no manual syncing.
- Meta Graph calls live in src/lib/pulse/meta.server.ts behind server functions in meta.functions.ts (not Edge Functions), API version in one constant, responses cached 1h in meta_cache (service-role only). Why: the token stays server-side and the stack forbids new Edge Functions.
- Provider sign-ins (Google, LinkedIn) always open in a separate popup window via openSignIn in pulse/settings.tsx, never inside the app frame. Why: Google/LinkedIn refuse to load in frames (ERR_BLOCKED_BY_RESPONSE).
- Pulse reports fill the design team template (src/lib/pulse/report/template.ts, rendered by render.ts) from pulse_* data in report.functions.ts; saved docs live in pulse_reports. AI text must not contain figures (stripped server-side). Why: every number in a report traces to the data.
- Report edits persist as customHtml inside pulse_reports.data; visual editing, source editing, printing and HTML export share that document, with script-free sandboxed previews and embedded export assets. Why: complete user edits survive reopening without modifying live analytics.
- Post Designer creates and schedules posts (studio.functions queuePost → schedule table); Post Scheduler is calendar-only plus manual uploads to brand-assets. Why: designing and scheduling are separate jobs.
- Email designs, site pages and CMS entries are stored per brand (email_designs, site_pages, cms_entries, owner-only RLS); emails render from block JSON via components/email/EmailPreview. Why: one renderer for marketing preview and designer.
- Brand colours, fonts and logo placement for every preview come from src/lib/brandTheme.ts (themeFrom/useBrandTheme); never hardcode a client's colours in a screen. Why: one brand kit per account drives all designs.
- Site pages are typed section JSON rendered by components/site/SitePage in builder, preview and the public /site/$brandId/$slug route; the public route reads only status='published' rows server-side. Why: the builder and the live site can never drift.
- The in-app agent lives in src/lib/agent/ (agent.server.ts = LLM + tools, skills.ts = playbooks) and is called via chatWithMarlowe; its tools write the same tables the screens read, and filter by userId explicitly. Why: the nightly hook runs scheduled agent tasks with the service-role client.
- YouTube sign-ins use the YOUTUBE_OAUTH_* client, Business Profile uses GOOGLE_OAUTH_*; pulse_google_accounts is unique per email+purpose. Why: separate Google apps issue separate refresh tokens.

- Agent chats live in agent_threads + chat_messages.thread_id; scheduled tasks run hourly via /api/public/hooks/agent-tasks (managed cron), not the nightly pulse-sync. Why: tasks like 'report on the 1st' need timely runs and results land in their own thread.
- Agent skills/tool switches/remote MCP servers are per user (agent_skills, agent_settings, agent_mcp_servers); MCP auth headers are readable only by the service role and loaded inside runAgent. Why: keys never reach the browser.

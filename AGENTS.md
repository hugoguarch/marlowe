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
- Pulse lives under /pulse with its own shell; all reads go through src/lib/pulse/pulse.functions.ts and pure helpers in src/lib/pulse/metrics.ts, so live adapters only need to write the pulse_* tables (keeps sample and live data interchangeable).

- Pulse metrics carry a `site` column (part of the primary key) and connections are unique per client+provider+account, so a client can have several websites/accounts per channel; `pulse_series` takes an optional `_site` filter. Why: clients like CLS run multiple sites.
- Pulse nightly sync runs via pg_cron calling `/api/public/hooks/pulse-sync`, which only re-pulls provider data (idempotent). Why: no manual syncing.
- Meta Graph calls live in src/lib/pulse/meta.server.ts behind server functions in meta.functions.ts (not Edge Functions), API version in one constant, responses cached 1h in meta_cache (service-role only). Why: the token stays server-side and the stack forbids new Edge Functions.
- Provider sign-ins (Google, LinkedIn) always open in a separate popup window via openSignIn in pulse/settings.tsx, never inside the app frame. Why: Google/LinkedIn refuse to load in frames (ERR_BLOCKED_BY_RESPONSE).
- Pulse reports fill the design team template (src/lib/pulse/report/template.ts, rendered by render.ts) from pulse_* data in report.functions.ts; saved docs live in pulse_reports. AI text must not contain figures (stripped server-side). Why: every number in a report traces to the data.

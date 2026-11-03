/**
 * Apps shown on the Connections page. Remote MCP addresses come from each provider's own docs;
 * apps without a documented server are listed as "soon" rather than guessing an address.
 *  - key: paste an API key, stored server-side as the MCP auth header.
 *  - oauth: provider's MCP server uses sign-in; one-click sign-in is next on the roadmap.
 *  - builtin: already connected through Settings → Data sources.
 */
export type AppAuth = "key" | "oauth" | "builtin" | "soon";
export type AppCategory = "Email marketing" | "CRM & sales" | "Social & scheduling" | "Productivity" | "Design" | "Analytics";

export type ConnectApp = {
  id: string;
  name: string;
  by: string;
  category: AppCategory;
  summary: string;
  icon: string; // simpleicons slug
  color: string; // brand hex, used for the logo tile only
  auth: AppAuth;
  mcpUrl?: string;
  /** Header template; {key} is replaced with what the person pastes. */
  header?: string;
  keyLabel?: string;
  keyHelp?: string;
  docs?: string;
  extraField?: { name: string; label: string; header: string };
};

export const APPS: ConnectApp[] = [
  { id: "instantly", name: "Instantly", by: "Instantly", category: "Email marketing", summary: "Cold email campaigns, leads and reply analytics.", icon: "maildotru", color: "#1E6BFF", auth: "key", mcpUrl: "https://mcp.instantly.ai/mcp", header: "Authorization: Bearer {key}", keyLabel: "Instantly API key", keyHelp: "Instantly → Settings → Integrations → API Keys → Create (scope: All).", docs: "https://developer.instantly.ai/mcp/authentication" },
  { id: "mailchimp-transactional", name: "Mailchimp Transactional", by: "Intuit Mailchimp", category: "Email marketing", summary: "Transactional sends, templates and delivery diagnostics.", icon: "mailchimp", color: "#FFE01B", auth: "key", mcpUrl: "https://mandrillapp.com/mcp", header: "Authorization: Bearer {key}", keyLabel: "Mandrill API key", keyHelp: "Mailchimp Transactional → Settings → SMTP & API Info → New API key.", docs: "https://mailchimp.com/developer/transactional/guides/how-to-use-mailchimps-transactional-messaging-mcp/" },
  { id: "mailchimp", name: "Mailchimp Marketing", by: "Intuit Mailchimp", category: "Email marketing", summary: "Campaign and audience reports. Mailchimp has no official server for this yet.", icon: "mailchimp", color: "#FFE01B", auth: "soon" },
  { id: "klaviyo", name: "Klaviyo", by: "Klaviyo", category: "Email marketing", summary: "Campaign and flow performance, segments and campaigns.", icon: "klaviyo", color: "#232426", auth: "oauth", mcpUrl: "https://mcp.klaviyo.com/mcp", docs: "https://developers.klaviyo.com/en/docs/connect_to_the_klaviyo_mcp_server" },
  { id: "brevo", name: "Brevo", by: "Brevo", category: "Email marketing", summary: "Email and SMS campaigns and contact lists.", icon: "brevo", color: "#0B996E", auth: "soon" },
  { id: "activecampaign", name: "ActiveCampaign", by: "ActiveCampaign", category: "Email marketing", summary: "Automations, campaigns and CRM contacts.", icon: "activecampaign", color: "#004CFF", auth: "soon" },

  { id: "gohighlevel", name: "GoHighLevel", by: "HighLevel", category: "CRM & sales", summary: "Contacts, pipelines, conversations and social posting.", icon: "gohighlevel", color: "#155EEF", auth: "key", mcpUrl: "https://services.leadconnectorhq.com/mcp/", header: "Authorization: Bearer {key}", keyLabel: "Private integration token", keyHelp: "HighLevel → Settings → Private Integrations → Create.", extraField: { name: "locationId", label: "Location ID", header: "locationId" } },
  { id: "hubspot", name: "HubSpot", by: "HubSpot", category: "CRM & sales", summary: "CRM contacts, companies, deals and marketing data.", icon: "hubspot", color: "#FF7A59", auth: "oauth", mcpUrl: "https://mcp.hubspot.com/" },

  { id: "meta", name: "Meta (Facebook & Instagram)", by: "Meta", category: "Social & scheduling", summary: "Page and Instagram insights, posts and ad accounts.", icon: "meta", color: "#0467DF", auth: "builtin" },
  { id: "linkedin", name: "LinkedIn", by: "LinkedIn", category: "Social & scheduling", summary: "Company page followers, posts and engagement.", icon: "linkedin", color: "#0A66C2", auth: "builtin" },
  { id: "youtube", name: "YouTube", by: "Google", category: "Social & scheduling", summary: "Channel views, watch time, retention and subscribers.", icon: "youtube", color: "#FF0000", auth: "builtin" },
  { id: "buffer", name: "Buffer", by: "Buffer", category: "Social & scheduling", summary: "Schedule and publish social posts.", icon: "buffer", color: "#231F20", auth: "soon" },
  { id: "metricool", name: "Metricool", by: "Metricool", category: "Social & scheduling", summary: "Cross-channel social analytics and scheduling.", icon: "metricool", color: "#1F7AE0", auth: "soon" },
  { id: "tiktok", name: "TikTok", by: "TikTok", category: "Social & scheduling", summary: "Video views, followers and engagement.", icon: "tiktok", color: "#000000", auth: "soon" },

  { id: "notion", name: "Notion", by: "Notion", category: "Productivity", summary: "Search and update pages and databases.", icon: "notion", color: "#000000", auth: "oauth", mcpUrl: "https://mcp.notion.com/mcp" },
  { id: "linear", name: "Linear", by: "Linear", category: "Productivity", summary: "Issues, projects and cycles.", icon: "linear", color: "#5E6AD2", auth: "oauth", mcpUrl: "https://mcp.linear.app/mcp" },
  { id: "atlassian", name: "Atlassian", by: "Atlassian", category: "Productivity", summary: "Jira issues and Confluence pages.", icon: "atlassian", color: "#0052CC", auth: "oauth", mcpUrl: "https://mcp.atlassian.com/v1/sse" },
  { id: "slack", name: "Slack", by: "Slack", category: "Productivity", summary: "Send messages and read channels.", icon: "slack", color: "#4A154B", auth: "soon" },
  { id: "google-drive", name: "Google Drive", by: "Google", category: "Productivity", summary: "Search, read and upload files.", icon: "googledrive", color: "#1FA463", auth: "soon" },
  { id: "google-sheets", name: "Google Sheets", by: "Google", category: "Productivity", summary: "Read and update spreadsheets.", icon: "googlesheets", color: "#34A853", auth: "soon" },
  { id: "google-docs", name: "Google Docs", by: "Google", category: "Productivity", summary: "Edit and summarise documents.", icon: "googledocs", color: "#4285F4", auth: "soon" },
  { id: "gmail", name: "Gmail", by: "Google", category: "Productivity", summary: "Draft replies and search your inbox.", icon: "gmail", color: "#EA4335", auth: "soon" },
  { id: "google-calendar", name: "Google Calendar", by: "Google", category: "Productivity", summary: "Manage your schedule.", icon: "googlecalendar", color: "#4285F4", auth: "soon" },

  { id: "canva", name: "Canva", by: "Canva", category: "Design", summary: "Search, create, autofill and export designs.", icon: "canva", color: "#00C4CC", auth: "oauth", mcpUrl: "https://mcp.canva.com/mcp" },
  { id: "figma", name: "Figma", by: "Figma", category: "Design", summary: "Design context for posts and sites.", icon: "figma", color: "#F24E1E", auth: "soon" },

  { id: "google-business", name: "Google Business Profile", by: "Google", category: "Analytics", summary: "Profile views, calls, directions and reviews.", icon: "google", color: "#4285F4", auth: "builtin" },
  { id: "search-console", name: "Search Console", by: "Google", category: "Analytics", summary: "Clicks, impressions and positions.", icon: "googlesearchconsole", color: "#458CF5", auth: "builtin" },
  { id: "google-analytics", name: "Google Analytics", by: "Google", category: "Analytics", summary: "Website sessions, sources and conversions.", icon: "googleanalytics", color: "#E37400", auth: "soon" },
  { id: "posthog", name: "PostHog", by: "PostHog", category: "Analytics", summary: "Product analytics, funnels and feature flags.", icon: "posthog", color: "#1D4AFF", auth: "key", mcpUrl: "https://mcp.posthog.com/mcp", header: "Authorization: Bearer {key}", keyLabel: "Personal API key", keyHelp: "PostHog → Settings → Personal API keys → Create (MCP Server preset)." },
  { id: "semrush", name: "Semrush", by: "Semrush", category: "Analytics", summary: "Keywords, backlinks and competitor visibility.", icon: "semrush", color: "#FF642D", auth: "soon" },
];

export const CATEGORIES: AppCategory[] = ["Email marketing", "CRM & sales", "Social & scheduling", "Productivity", "Design", "Analytics"];

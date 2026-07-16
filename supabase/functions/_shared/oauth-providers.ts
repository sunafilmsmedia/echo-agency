// OAuth provider registry.
// Add a new provider here → both oauth-start & oauth-callback pick it up.
// Client secrets are ALWAYS read from Deno.env in the Edge Function, never here.

export interface OAuthProvider {
  authorizeUrl: string;
  tokenUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  scope: string;
  // Extra params for the authorize URL (provider-specific)
  extraAuthorizeParams?: Record<string, string>;
  // If true, generate PKCE code_verifier/challenge and include them in the flow
  usesPkce?: boolean;
  // Optional: called after successful token exchange to enrich `metadata` (email, user URI, etc.)
  fetchMetadata?: (accessToken: string) => Promise<Record<string, unknown>>;
}

export const PROVIDERS: Record<string, OAuthProvider> = {
  calendly: {
    authorizeUrl: "https://auth.calendly.com/oauth/authorize",
    tokenUrl:     "https://auth.calendly.com/oauth/token",
    clientIdEnv:     "CALENDLY_CLIENT_ID",
    clientSecretEnv: "CALENDLY_CLIENT_SECRET",
    scope: "",
    usesPkce: true,
    fetchMetadata: async (token) => {
      const r = await fetch("https://api.calendly.com/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return {};
      const j = await r.json();
      return {
        user_uri:   j?.resource?.uri,
        user_email: j?.resource?.email,
        user_name:  j?.resource?.name,
      };
    },
  },
  google_calendar: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl:     "https://oauth2.googleapis.com/token",
    clientIdEnv:     "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    scope: "openid email https://www.googleapis.com/auth/calendar.readonly",
    extraAuthorizeParams: { access_type: "offline", prompt: "consent" },
    fetchMetadata: async (token) => {
      const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return {};
      const j = await r.json();
      return { user_email: j?.email, user_name: j?.name };
    },
  },
  gmail: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl:     "https://oauth2.googleapis.com/token",
    clientIdEnv:     "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    scope: "openid email https://www.googleapis.com/auth/gmail.send",
    extraAuthorizeParams: { access_type: "offline", prompt: "consent" },
    fetchMetadata: async (token) => {
      const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return {};
      const j = await r.json();
      return { user_email: j?.email, user_name: j?.name };
    },
  },
  stripe: {
    authorizeUrl: "https://connect.stripe.com/oauth/authorize",
    tokenUrl:     "https://connect.stripe.com/oauth/token",
    clientIdEnv:     "STRIPE_CLIENT_ID",
    clientSecretEnv: "STRIPE_SECRET_KEY",
    scope: "read_write",
  },
};

export function getProvider(name: string): OAuthProvider {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Unknown OAuth provider: ${name}`);
  return p;
}

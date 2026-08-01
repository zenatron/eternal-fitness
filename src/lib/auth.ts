import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const isDevBypass =
  process.env.AUTH_DEV_BYPASS === "true" &&
  process.env.NODE_ENV !== "production";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [
  {
    id: "pocketid",
    name: "PocketID",
    type: "oidc",
    issuer: process.env.AUTH_POCKETID_ISSUER,
    clientId: process.env.AUTH_POCKETID_ID,
    clientSecret: process.env.AUTH_POCKETID_SECRET,
    /**
     * `state` must be listed explicitly.
     *
     * Auth.js v5 defaults `checks` to `["pkce"]` and only appends `"state"`
     * when `redirectProxyUrl` is configured (see
     * @auth/core/lib/utils/providers.js `normalizeOAuth`). Without this the
     * authorization request carries no `state` parameter at all, and PocketID
     * rejects it with `invalid_state` — surfacing confusingly as a
     * CallbackRouteError about a missing `iss`, because Auth.js then tries to
     * validate the provider's error redirect.
     *
     * PKCE alone satisfies the modern OAuth spec, but PocketID enforces state
     * as well, so both are required here.
     */
    checks: ["pkce", "state"],
    authorization: {
      params: { scope: "openid profile email" },
    },
  },
];

if (isDevBypass) {
  providers.push(
    Credentials({
      id: "dev-bypass",
      name: "Dev Bypass",
      credentials: {
        email: { label: "Email", type: "text", value: "dev@eternal-fitness.local" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string) || "dev@eternal-fitness.local";
        const name = email.split("@")[0];
        return {
          id: `dev-${email}`,
          email,
          name: name.charAt(0).toUpperCase() + name.slice(1),
        };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account && profile) {
        token.sub = profile.sub as string;
        token.email = (profile.email as string) ?? undefined;
        token.name = profile.name as string | undefined;
        // Standard OIDC claim; PocketID sends it when the user has an avatar.
        // Kept on the token so /api/profile can persist it without a second
        // round-trip to the userinfo endpoint.
        token.picture = (profile.picture as string) ?? undefined;
      }
      if (account?.provider === "dev-bypass" && user) {
        token.sub = user.id as string;
        token.email = user.email as string;
        token.name = user.name as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = (token.picture as string | undefined) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

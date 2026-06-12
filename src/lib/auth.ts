import NextAuth from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: "pocketid",
      name: "PocketID",
      type: "oidc",
      issuer: process.env.AUTH_POCKETID_ISSUER,
      clientId: process.env.AUTH_POCKETID_ID,
      clientSecret: process.env.AUTH_POCKETID_SECRET,
      authorization: {
        params: { scope: "openid profile email" },
      },
    },
  ],
  trustHost: true,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.sub = profile.sub as string;
        token.email = (profile.email as string) ?? undefined;
        token.name = profile.name as string | undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
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

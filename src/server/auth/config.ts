import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateCredentials } from "./credentials";
import { getDb } from "@/server/db/client";
import { isRole } from "@/domain/permissions";

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      // Auth.js acrescenta campos como csrfToken: passar apenas as credenciais ao schema estrito.
      authorize: (credentials) =>
        authenticateCredentials({
          email: credentials.email,
          password: credentials.password,
        }),
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
      }
      if (!token.sub) return null;
      const current = await getDb().user.findUnique({ where: { id: token.sub }, select: { role: true, isActive: true, sessionVersion: true } });
      if (!current?.isActive || current.sessionVersion !== (token.sessionVersion ?? 0)) return null;
      token.role = current.role;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.sessionVersion = typeof token.sessionVersion === "number" ? token.sessionVersion : 0;
      if (isRole(token.role))
        session.user.role = token.role;
      return session;
    },
  },
});

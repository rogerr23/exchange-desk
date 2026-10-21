import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateCredentials } from "./credentials";

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
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.role === "ADMIN" || token.role === "OPERATOR")
        session.user.role = token.role;
      return session;
    },
  },
});

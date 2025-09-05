import type { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: {
          label: "Email:",
          type: "text",
          placeholder: "your-cool-username",
        },
        password: {
          label: "Password:",
          type: "password",
          placeholder: "your-awesome-password",
        },
      },
      async authorize(
        credentials: Record<"email" | "password", string> | undefined
      ): Promise<User | null> {
        if (!credentials) return null;

        const { email, password } = credentials;

        const userFromDb = await prisma.user.findUnique({
          where: { email },
        });

        if (!userFromDb || !userFromDb.password) return null;

        const isPasswordCorrect = await bcrypt.compare(
          password,
          userFromDb.password
        );
        if (!isPasswordCorrect) return null;

        // Map Prisma user to NextAuth User type
        const user: User = {
          id: userFromDb.id?.toString() || "", // fallback to empty string if undefined
          name: userFromDb.name || undefined,
          email: userFromDb.email || undefined,
        };

        return user;
      },
    }),
  ],
  pages: { signIn: "/login", newUser: "/" },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

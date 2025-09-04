// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import bcrypt from "bcryptjs";

// GET: list users (admin only)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: users });
}

// POST: create user (admin only) — no email verification flow
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const json = await request.json();
  const name: string | undefined = json?.name;
  const email: string | undefined = json?.email;
  const password: string | undefined = json?.password;
  const role: "ADMIN" | "USER" | undefined = json?.role;

  if (!name || !email || !password || !role) {
    return NextResponse.json(
      { error: "name, email, password, role are required" },
      { status: 400 }
    );
  }
  if (role !== "ADMIN" && role !== "USER") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { data: newUser, message: "User created." },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (
  typeof err === "object" &&
  err &&
  "code" in err &&
  (err as { code?: string; meta?: { target?: string[] } }).code === "P2002" &&
  (err as { code?: string; meta?: { target?: string[] } }).meta?.target?.includes("email")
    ) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }
    console.error("Create user error:", err);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

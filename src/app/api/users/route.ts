import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toErrorResponse } from "@/lib/errors";

// List seeded/mock users (for the user switcher and the share dialog).
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return toErrorResponse(error);
  }
}

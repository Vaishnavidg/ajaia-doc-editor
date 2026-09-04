import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, SESSION_COOKIE } from "@/lib/auth";
import { toErrorResponse, ValidationError } from "@/lib/errors";

// Return the currently "logged in" mock user.
export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

const bodySchema = z.object({ userId: z.string().min(1) });

// Switch the active mock user (sets a cookie).
export async function POST(request: NextRequest) {
  try {
    const { userId } = bodySchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ValidationError("Unknown user");

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
    response.cookies.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}

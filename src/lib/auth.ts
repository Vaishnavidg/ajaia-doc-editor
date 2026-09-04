import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError } from "@/lib/errors";
import type { User } from "@prisma/client";

export const SESSION_COOKIE = "userId";

/**
 * Mock authentication: the "logged in" user is whoever the client selected in
 * the user switcher (stored in a cookie). If no user is selected we fall back
 * to the first seeded user so the app is usable on first load.
 *
 * Real auth is explicitly out of scope for this assignment.
 */
export async function getCurrentUser(): Promise<User> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return user;
  }

  const fallback = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!fallback) {
    throw new UnauthorizedError("No users are seeded. Run `npm run db:seed`.");
  }
  return fallback;
}

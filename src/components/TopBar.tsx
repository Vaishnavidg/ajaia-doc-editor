import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { UserSwitcher } from "@/components/UserSwitcher";
import type { UserSummary } from "@/lib/types";

export async function TopBar() {
  // Don't let a database hiccup take down the whole app shell.
  const [users, currentUser] = await Promise.all([
    prisma.user
      .findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true },
      })
      .catch((): UserSummary[] => []),
    getCurrentUser().catch(() => null),
  ]);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/documents" className="text-lg font-semibold text-gray-900">
          Ajaia Docs
        </Link>
        {users.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-gray-500 sm:inline">Viewing as</span>
            <UserSwitcher
              users={users}
              currentUserId={currentUser?.id ?? users[0]?.id ?? ""}
            />
          </div>
        )}
      </div>
    </header>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { apiSend } from "@/lib/api-client";
import type { UserSummary } from "@/lib/types";

export function UserSwitcher({
  users,
  currentUserId,
}: {
  users: UserSummary[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleChange(userId: string) {
    setError(null);
    try {
      await apiSend("/api/session", "POST", { userId });
      startTransition(() => {
        router.refresh();
        router.push("/documents");
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to switch user");
    }
  }

  return (
    <div className="flex flex-col items-end">
      <select
        aria-label="Switch user"
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
        value={currentUserId}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value)}
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 text-xs text-red-600">{error}</span>}
    </div>
  );
}

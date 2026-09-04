"use client";

import { useState } from "react";
import { apiSend } from "@/lib/api-client";
import type { UserSummary } from "@/lib/types";

export function UserSwitcher({
  users,
  currentUserId,
}: {
  users: UserSummary[];
  currentUserId: string;
}) {
  // Local state so the <select> reflects the choice immediately, before the
  // full page reload lands.
  const [value, setValue] = useState(currentUserId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(userId: string) {
    setValue(userId);
    setError(null);
    setBusy(true);
    try {
      await apiSend("/api/session", "POST", { userId });
      // The mock user lives in a cookie read by server components (TopBar,
      // dashboard, editor), so force a real navigation to re-render everything.
      // The cache-busting query param defeats any stale HTTP / service-worker
      // cache that would otherwise serve the previous user's page.
      window.location.replace(`/documents?_=${Date.now()}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to switch user";
      // A stale page (e.g. after a DB re-seed) can hold user IDs that no longer
      // exist. Reload to pull a fresh user list instead of dead-ending.
      if (message === "Unknown user") {
        window.location.reload();
        return;
      }
      setValue(currentUserId);
      setBusy(false);
      setError(message);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <select
        aria-label="Switch user"
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm disabled:opacity-60"
        value={value}
        disabled={busy}
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

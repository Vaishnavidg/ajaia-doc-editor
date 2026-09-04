"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "@/lib/api-client";
import type {
  DocumentDetail,
  DocumentShareSummary,
  UserSummary,
} from "@/lib/types";

export function ShareDialog({
  documentId,
  ownerId,
  currentUserId,
  shares,
  onChange,
  onClose,
}: {
  documentId: string;
  ownerId: string;
  currentUserId: string;
  shares: DocumentShareSummary[];
  onChange: (shares: DocumentShareSummary[]) => void;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ users: UserSummary[] }>("/api/users")
      .then((res) => setUsers(res.users))
      .catch(() => setError("Failed to load users"));
  }, []);

  const shareableUsers = useMemo(() => {
    const sharedIds = new Set(shares.map((s) => s.userId));
    return users.filter((u) => u.id !== ownerId && !sharedIds.has(u.id));
  }, [users, shares, ownerId]);

  useEffect(() => {
    if (!selected && shareableUsers.length > 0) {
      setSelected(shareableUsers[0].id);
    }
  }, [shareableUsers, selected]);

  async function addShare() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiSend<{ document: DocumentDetail }>(
        `/api/documents/${documentId}/shares`,
        "POST",
        { userId: selected },
      );
      onChange(res.document.shares);
      setSelected("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to share");
    } finally {
      setBusy(false);
    }
  }

  async function removeShare(userId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await apiSend<{ document: DocumentDetail }>(
        `/api/documents/${documentId}/shares/${userId}`,
        "DELETE",
      );
      onChange(res.document.shares);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">Share document</h2>
        <p className="mt-1 text-sm text-gray-500">
          Shared users can view and edit this document.
        </p>

        <div className="mt-4 flex gap-2">
          <select
            aria-label="User to share with"
            className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={shareableUsers.length === 0}
          >
            {shareableUsers.length === 0 ? (
              <option value="">No more users to share with</option>
            ) : (
              shareableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            onClick={addShare}
            disabled={busy || !selected}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            People with access
          </h3>
          <ul className="mt-2 space-y-1">
            <li className="flex items-center justify-between rounded px-2 py-1 text-sm">
              <span className="text-gray-700">
                Owner
                {ownerId === currentUserId ? " (you)" : ""}
              </span>
            </li>
            {shares.map((s) => (
              <li
                key={s.userId}
                className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-gray-50"
              >
                <span className="text-gray-700">
                  {s.user.name}
                  {s.userId === currentUserId ? " (you)" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => removeShare(s.userId)}
                  disabled={busy}
                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

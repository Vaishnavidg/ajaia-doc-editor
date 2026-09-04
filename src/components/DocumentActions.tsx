"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiSend } from "@/lib/api-client";
import { ImportDialog } from "@/components/ImportDialog";

export function DocumentActions() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createDocument() {
    setError(null);
    setCreating(true);
    try {
      const doc = await apiSend<{ id: string }>("/api/documents", "POST", {});
      router.push(`/documents/${doc.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create document");
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Import file
        </button>
        <button
          type="button"
          onClick={createDocument}
          disabled={creating}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {creating ? "Creating…" : "New document"}
        </button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onImported={(id) => router.push(`/documents/${id}`)}
        />
      )}
    </div>
  );
}

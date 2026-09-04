"use client";

import { useRef, useState } from "react";
import { apiUpload } from "@/lib/api-client";

const SUPPORTED = ".txt, .md";
const MAX_KB = 1000;

export function ImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (documentId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    setError(null);

    if (!file) {
      setError("Choose a file first");
      return;
    }
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".txt") && !lower.endsWith(".md")) {
      setError(`Unsupported file type. Supported: ${SUPPORTED}`);
      return;
    }
    if (file.size > MAX_KB * 1024) {
      setError(`File is too large. Max ${MAX_KB} KB.`);
      return;
    }

    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const doc = await apiUpload<{ id: string }>(
        "/api/documents/import",
        formData,
      );
      onImported(doc.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-5 text-left shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">Import a file</h2>
        <p className="mt-1 text-sm text-gray-500">
          Supported types: <strong>{SUPPORTED}</strong> — max {MAX_KB} KB. The
          file is converted into an editable document.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          className="mt-4 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-gray-700"
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={busy}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {busy ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}

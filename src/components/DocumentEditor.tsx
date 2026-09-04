"use client";

import { useCallbackRef } from "@/lib/use-callback-ref";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { apiSend } from "@/lib/api-client";
import { EditorToolbar } from "@/components/EditorToolbar";
import { SaveStatus, type SaveState } from "@/components/SaveStatus";
import { ShareDialog } from "@/components/ShareDialog";
import type { DocumentDetail, DocumentShareSummary } from "@/lib/types";

const AUTOSAVE_MS = 800;

export function DocumentEditor({
  initialDocument,
  currentUserId,
}: {
  initialDocument: DocumentDetail;
  currentUserId: string;
}) {
  const router = useRouter();
  const isOwner = initialDocument.role === "owner";

  const [title, setTitle] = useState(initialDocument.title);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [shares, setShares] = useState<DocumentShareSummary[]>(
    initialDocument.shares,
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef(title);
  titleRef.current = title;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
    ],
    content: initialDocument.content || "<p></p>",
    editorProps: {
      attributes: {
        class: "doc-content min-h-[420px] px-4 py-3",
        "data-placeholder": "Start writing…",
      },
    },
    onUpdate: () => scheduleSave(),
  });

  const save = useCallbackRef(async () => {
    if (!editor) return;
    setSaveState("saving");
    try {
      await apiSend(`/api/documents/${initialDocument.id}`, "PATCH", {
        title: titleRef.current.trim() || "Untitled document",
        content: editor.getHTML(),
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  });

  const scheduleSave = useCallback(() => {
    setSaveState("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(), AUTOSAVE_MS);
  }, [save]);

  // Flush a pending save when leaving the page.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        save();
      }
    };
  }, [save]);

  async function handleDelete() {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await apiSend(`/api/documents/${initialDocument.id}`, "DELETE");
      router.push("/documents");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/documents"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Documents
        </Link>
        <div className="flex items-center gap-3">
          <SaveStatus state={saveState} />
          {isOwner ? (
            <>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Share{shares.length > 0 ? ` (${shares.length})` : ""}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </>
          ) : (
            <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
              Shared by {initialDocument.owner.name}
            </span>
          )}
        </div>
      </div>

      <input
        aria-label="Document title"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          scheduleSave();
        }}
        placeholder="Untitled document"
        className="mt-4 w-full border-0 bg-transparent text-2xl font-semibold text-gray-900 outline-none placeholder:text-gray-400"
      />

      <div className="mt-3">
        <EditorToolbar editor={editor} />
        <div className="rounded-b-lg border border-gray-200 bg-white">
          <EditorContent editor={editor} />
        </div>
      </div>

      {shareOpen && (
        <ShareDialog
          documentId={initialDocument.id}
          ownerId={initialDocument.ownerId}
          currentUserId={currentUserId}
          shares={shares}
          onChange={setShares}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

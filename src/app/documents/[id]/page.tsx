import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDocumentForUser } from "@/lib/documents";
import { AppError } from "@/lib/errors";
import { DocumentEditor } from "@/components/DocumentEditor";
import type { DocumentDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  let document: DocumentDetail;
  try {
    const record = await getDocumentForUser(user.id, id);
    document = {
      id: record.id,
      title: record.title,
      content: record.content,
      updatedAt: new Date(record.updatedAt).toISOString(),
      ownerId: record.ownerId,
      owner: record.owner,
      shares: record.shares.map((s) => ({
        id: s.id,
        userId: s.userId,
        user: s.user,
      })),
      role: record.role,
    };
  } catch (error) {
    const message =
      error instanceof AppError ? error.message : "Something went wrong";
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-gray-900">
          Can&apos;t open this document
        </h1>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <Link
          href="/documents"
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to documents
        </Link>
      </div>
    );
  }

  return <DocumentEditor initialDocument={document} currentUserId={user.id} />;
}

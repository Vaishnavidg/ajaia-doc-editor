import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listDocumentsForUser } from "@/lib/documents";
import { DocumentActions } from "@/components/DocumentActions";
import type { DocumentListItem } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function DocumentCard({
  doc,
  showOwner,
}: {
  doc: DocumentListItem;
  showOwner: boolean;
}) {
  return (
    <Link
      href={`/documents/${doc.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-400 hover:shadow-sm"
    >
      <h3 className="truncate font-medium text-gray-900">{doc.title}</h3>
      <p className="mt-1 text-xs text-gray-500">
        Updated {formatDate(doc.updatedAt)}
      </p>
      {showOwner && (
        <p className="mt-1 text-xs text-gray-500">Owner: {doc.owner.name}</p>
      )}
    </Link>
  );
}

function Section({
  title,
  emptyText,
  docs,
  showOwner,
}: {
  title: string;
  emptyText: string;
  docs: DocumentListItem[];
  showOwner: boolean;
}) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title} ({docs.length})
      </h2>
      {docs.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyText}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} showOwner={showOwner} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  const { owned, shared } = await listDocumentsForUser(user.id);

  // Dates come back as Date objects from Prisma; serialize for the card.
  const toItem = (d: (typeof owned)[number]): DocumentListItem => ({
    id: d.id,
    title: d.title,
    updatedAt: new Date(d.updatedAt).toISOString(),
    owner: d.owner,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
        <DocumentActions />
      </div>

      <div className="mt-6">
        <Section
          title="Owned by me"
          emptyText="You haven't created any documents yet."
          docs={owned.map(toItem)}
          showOwner={false}
        />
        <Section
          title="Shared with me"
          emptyText="No documents have been shared with you."
          docs={shared.map(toItem)}
          showOwner
        />
      </div>
    </div>
  );
}

import path from "node:path";
import { prisma } from "@/lib/prisma";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import {
  markdownToHtml,
  sanitizeDocumentHtml,
  txtToHtml,
} from "@/lib/content";
import {
  MAX_IMPORT_BYTES,
  MAX_TITLE_LENGTH,
  SUPPORTED_IMPORT_EXTENSIONS,
  type ShareDocumentInput,
  type UpdateDocumentInput,
} from "@/lib/validation";

export type DocumentRole = "owner" | "editor";

const ownerSelect = { id: true, name: true, email: true } as const;

/** Documents the user owns or that have been shared with them. */
export async function listDocumentsForUser(userId: string) {
  const [owned, shared] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        owner: { select: ownerSelect },
      },
    }),
    prisma.document.findMany({
      where: { shares: { some: { userId } } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        owner: { select: ownerSelect },
      },
    }),
  ]);

  return { owned, shared };
}

/** Load a single document, enforcing that the user may access it. */
export async function getDocumentForUser(userId: string, documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      owner: { select: ownerSelect },
      shares: {
        include: { user: { select: ownerSelect } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!document) {
    throw new NotFoundError("Document not found");
  }

  const isOwner = document.ownerId === userId;
  const isSharedWithUser = document.shares.some((s) => s.userId === userId);

  if (!isOwner && !isSharedWithUser) {
    throw new ForbiddenError();
  }

  const role: DocumentRole = isOwner ? "owner" : "editor";
  return { ...document, role };
}

export async function createDocument(
  userId: string,
  input: { title?: string },
) {
  return prisma.document.create({
    data: {
      title: input.title?.trim() || "Untitled document",
      content: "<p></p>",
      ownerId: userId,
    },
    select: { id: true, title: true, updatedAt: true },
  });
}

/** Update title and/or content. Owner or a shared editor may do this. */
export async function updateDocument(
  userId: string,
  documentId: string,
  input: UpdateDocumentInput,
) {
  // getDocumentForUser throws if the user has no access.
  await getDocumentForUser(userId, documentId);

  const data: { title?: string; content?: string } = {};
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.content !== undefined) {
    data.content = sanitizeDocumentHtml(input.content);
  }

  return prisma.document.update({
    where: { id: documentId },
    data,
    select: { id: true, title: true, content: true, updatedAt: true },
  });
}

/** Only the owner may delete. */
export async function deleteDocument(userId: string, documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { ownerId: true },
  });
  if (!document) throw new NotFoundError("Document not found");
  if (document.ownerId !== userId) {
    throw new ForbiddenError("Only the owner can delete this document");
  }
  await prisma.document.delete({ where: { id: documentId } });
}

async function assertOwner(userId: string, documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { ownerId: true },
  });
  if (!document) throw new NotFoundError("Document not found");
  if (document.ownerId !== userId) {
    throw new ForbiddenError("Only the owner can manage sharing");
  }
}

/** Share a document with another user. Owner only. */
export async function addShare(
  userId: string,
  documentId: string,
  input: ShareDocumentInput,
) {
  await assertOwner(userId, documentId);

  if (input.userId === userId) {
    throw new ValidationError("You already own this document");
  }

  const target = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!target) throw new ValidationError("That user does not exist");

  await prisma.documentShare.upsert({
    where: {
      documentId_userId: { documentId, userId: input.userId },
    },
    create: { documentId, userId: input.userId },
    update: {},
  });

  return getDocumentForUser(userId, documentId);
}

/** Remove a share. Owner only. */
export async function removeShare(
  userId: string,
  documentId: string,
  targetUserId: string,
) {
  await assertOwner(userId, documentId);
  await prisma.documentShare.deleteMany({
    where: { documentId, userId: targetUserId },
  });
  return getDocumentForUser(userId, documentId);
}

/** Validate + convert an uploaded file, then create a document from it. */
export async function importDocument(
  userId: string,
  file: { name: string; size: number; text: string },
) {
  const ext = path.extname(file.name).toLowerCase();
  if (!SUPPORTED_IMPORT_EXTENSIONS.includes(ext as ".txt" | ".md")) {
    throw new ValidationError(
      `Unsupported file type "${ext || "unknown"}". Supported: ${SUPPORTED_IMPORT_EXTENSIONS.join(", ")}`,
    );
  }
  if (file.size > MAX_IMPORT_BYTES) {
    throw new ValidationError(
      `File is too large (${(file.size / 1000).toFixed(0)} KB). Maximum is 1 MB.`,
    );
  }
  if (file.text.trim().length === 0) {
    throw new ValidationError("File is empty");
  }

  const content = ext === ".md" ? markdownToHtml(file.text) : txtToHtml(file.text);
  const baseName = path.basename(file.name, ext).trim() || "Imported document";
  const title = baseName.slice(0, MAX_TITLE_LENGTH);

  return prisma.document.create({
    data: { title, content, ownerId: userId },
    select: { id: true, title: true, updatedAt: true },
  });
}

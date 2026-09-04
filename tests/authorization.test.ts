import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  addShare,
  createDocument,
  deleteDocument,
  getDocumentForUser,
  listDocumentsForUser,
  updateDocument,
} from "@/lib/documents";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

async function makeUser(name: string) {
  return prisma.user.create({
    data: { name, email: `${name.toLowerCase()}-${Date.now()}-${Math.random()}@test.dev` },
  });
}

beforeEach(async () => {
  // Order matters because of foreign keys.
  await prisma.documentShare.deleteMany();
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("document sharing authorization", () => {
  it("lets the owner and shared users in, and keeps everyone else out", async () => {
    const alice = await makeUser("Alice");
    const bob = await makeUser("Bob");
    const carol = await makeUser("Carol");

    // Alice creates a document.
    const created = await createDocument(alice.id, { title: "Roadmap" });

    // Owner can read it.
    const asOwner = await getDocumentForUser(alice.id, created.id);
    expect(asOwner.role).toBe("owner");

    // Carol (no relationship) cannot read it.
    await expect(getDocumentForUser(carol.id, created.id)).rejects.toBeInstanceOf(
      ForbiddenError,
    );

    // Alice shares with Bob.
    await addShare(alice.id, created.id, { userId: bob.id });

    // Bob can now read it, as an editor.
    const asBob = await getDocumentForUser(bob.id, created.id);
    expect(asBob.role).toBe("editor");

    // Carol still cannot.
    await expect(getDocumentForUser(carol.id, created.id)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("only lets authorized users edit, and only the owner manage sharing/deletion", async () => {
    const alice = await makeUser("Alice");
    const bob = await makeUser("Bob");
    const carol = await makeUser("Carol");
    const doc = await createDocument(alice.id, {});
    await addShare(alice.id, doc.id, { userId: bob.id });

    // Shared editor Bob can update content.
    const updated = await updateDocument(bob.id, doc.id, {
      content: "<p>Bob was here</p>",
    });
    expect(updated.content).toContain("Bob was here");

    // Carol cannot update.
    await expect(
      updateDocument(carol.id, doc.id, { content: "<p>nope</p>" }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    // Bob (editor, not owner) cannot share or delete.
    await expect(
      addShare(bob.id, doc.id, { userId: carol.id }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(deleteDocument(bob.id, doc.id)).rejects.toBeInstanceOf(
      ForbiddenError,
    );

    // Owner can delete.
    await deleteDocument(alice.id, doc.id);
    await expect(getDocumentForUser(alice.id, doc.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("separates owned vs shared documents in the listing", async () => {
    const alice = await makeUser("Alice");
    const bob = await makeUser("Bob");

    const aliceDoc = await createDocument(alice.id, { title: "Alice doc" });
    const bobDoc = await createDocument(bob.id, { title: "Bob doc" });
    await addShare(bob.id, bobDoc.id, { userId: alice.id });

    const list = await listDocumentsForUser(alice.id);
    expect(list.owned.map((d) => d.id)).toEqual([aliceDoc.id]);
    expect(list.shared.map((d) => d.id)).toEqual([bobDoc.id]);
  });
});

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Stable, human-readable IDs so re-seeding / resetting the database keeps the
// same user IDs. An already-open browser tab (whose "Viewing as" dropdown holds
// these IDs) then keeps working after a reset.
const USERS = [
  { id: "user_alice", name: "Alice Owner", email: "alice@example.com" },
  { id: "user_bob", name: "Bob Editor", email: "bob@example.com" },
  { id: "user_carol", name: "Carol Outsider", email: "carol@example.com" },
  { id: "user_dave", name: "Dave Reader", email: "dave@example.com" },
];

async function main() {
  for (const user of USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: user,
      update: { name: user.name, email: user.email },
    });
  }

  const alice = USERS[0];
  const bob = USERS[1];

  // A sample document owned by Alice and shared with Bob, so the app has
  // something to show on first run.
  await prisma.document.upsert({
    where: { id: "doc_welcome" },
    update: {},
    create: {
      id: "doc_welcome",
      title: "Welcome to Ajaia Docs",
      ownerId: alice.id,
      content:
        "<h1>Welcome to Ajaia Docs</h1>" +
        "<p>This document is <strong>owned by Alice</strong> and <em>shared with Bob</em>.</p>" +
        "<p>Try the toolbar: <strong>bold</strong>, <em>italic</em>, <u>underline</u>, headings and lists.</p>" +
        "<ul><li>Create or import a document</li><li>Format the text</li><li>Share it with a teammate</li></ul>",
    },
  });

  await prisma.documentShare.upsert({
    where: {
      documentId_userId: { documentId: "doc_welcome", userId: bob.id },
    },
    update: {},
    create: { documentId: "doc_welcome", userId: bob.id },
  });

  const count = await prisma.user.count();
  console.log(
    `Seeded ${count} users (${USERS.map((u) => u.email).join(", ")}).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

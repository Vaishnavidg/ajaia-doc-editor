import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USERS = [
  { name: "Alice Owner", email: "alice@example.com" },
  { name: "Bob Editor", email: "bob@example.com" },
  { name: "Carol Outsider", email: "carol@example.com" },
  { name: "Dave Reader", email: "dave@example.com" },
];

async function main() {
  for (const user of USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: user,
      update: { name: user.name },
    });
  }

  const alice = await prisma.user.findUniqueOrThrow({
    where: { email: "alice@example.com" },
  });
  const bob = await prisma.user.findUniqueOrThrow({
    where: { email: "bob@example.com" },
  });

  // A sample document owned by Alice and shared with Bob, so the app has
  // something to show on first run.
  const existing = await prisma.document.findFirst({
    where: { ownerId: alice.id, title: "Welcome to Ajaia Docs" },
  });
  if (!existing) {
    const doc = await prisma.document.create({
      data: {
        title: "Welcome to Ajaia Docs",
        ownerId: alice.id,
        content:
          "<h1>Welcome to Ajaia Docs</h1>" +
          "<p>This document is <strong>owned by Alice</strong> and <em>shared with Bob</em>.</p>" +
          "<p>Try the toolbar: <strong>bold</strong>, <em>italic</em>, <u>underline</u>, headings and lists.</p>" +
          "<ul><li>Create or import a document</li><li>Format the text</li><li>Share it with a teammate</li></ul>",
      },
    });
    await prisma.documentShare.create({
      data: { documentId: doc.id, userId: bob.id },
    });
  }

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

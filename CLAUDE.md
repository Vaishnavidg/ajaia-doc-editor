# CLAUDE.md

## Project

Ajaia Full Stack Product Engineer take-home assignment.

Build a lightweight collaborative document editor inspired by Google Docs.

**Timebox: 4–6 hours. Prioritize a reliable MVP over feature completeness.**

---

## Core Requirements

The application must support:

1. **Documents**

   - Create
   - Rename
   - Edit
   - Save/reopen
   - Persistent storage

2. **Rich Text**

   - Bold
   - Italic
   - Underline
   - Headings/text size
   - Bullet lists
   - Numbered lists

3. **File Import**

   - Support `.txt` and `.md`
   - Convert uploaded file into an editable document
   - Validate file type and size
   - Clearly show supported file types

4. **Sharing**

   - Seeded/mock users
   - Document owner
   - Share with another user
   - Owned vs Shared documents
   - Backend authorization must prevent unauthorized access

5. **Engineering**

   - Validation and error handling
   - At least one meaningful automated test
   - Production deployment
   - README with setup, architecture, tradeoffs, and AI workflow

---

## Default Stack

Use existing project technologies if already configured.

Otherwise prefer:

- Frontend: React + TypeScript
- Editor: TipTap
- Backend: Node.js + TypeScript + Express/NestJS
- Database: Prisma + SQLite
- Auth: seeded/mock users

Do not introduce unnecessary dependencies.

---

## Anti-Hallucination Rules

**Never assume. Always inspect.**

Before modifying anything:

1. Inspect the relevant files.
2. Verify existing functions, APIs, components, schemas, dependencies, and environment variables.
3. Reuse existing patterns.
4. Never invent files, APIs, database fields, or dependencies.
5. If something does not exist, explicitly say so before creating it.
6. Do not rewrite working code unnecessarily.

If requirements are ambiguous, choose the **simplest reasonable behavior** and document the decision.

---

## Implementation Rules

Build incrementally:

```text
Setup
→ Database
→ Document CRUD
→ Editor
→ Persistence
→ Sharing
→ File import
→ Tests
→ UI polish
→ Deployment
```

Do not implement all features at once.

After every significant feature:

```text
Implement
→ Run tests/build
→ Verify behavior
→ Fix issues
→ Continue
```

Never claim something works unless you actually verified it.

---

## Authorization

Document access must be checked on the backend.

A user may access a document only if:

```text
user == owner
OR
user has a DocumentShare record
```

Otherwise return an appropriate unauthorized/forbidden response.

Do not rely only on frontend visibility.

---

## Scope Control

Do NOT build unless there is significant time remaining:

- Real-time collaboration
- WebSockets
- Comments
- Version history
- Google OAuth
- Enterprise RBAC
- Offline sync
- Notifications
- Complex `.docx` processing

Focus on the core flow:

```text
Login
→ Create
→ Edit
→ Format
→ Save
→ Refresh
→ Import
→ Share
→ Access as another user
```

---

## Testing

At least one meaningful automated test must cover document sharing/authorization:

```text
User A creates document
→ shares with User B
→ User B can access
→ User C cannot access
```

Run the test and verify the result. Never create fake tests.

---

## Code Quality

Prefer:

- Simple code
- Clear naming
- Small focused functions
- Existing project conventions
- Proper TypeScript types
- Backend validation
- Meaningful error messages

Avoid:

- Premature abstraction
- Over-engineering
- Large unnecessary refactors
- Duplicate logic
- Unused dependencies
- Temporary hacks presented as final solutions

---

## AI Usage

AI is an implementation assistant, not the decision maker.

Use AI for:

- Boilerplate
- Debugging
- Test generation
- Documentation
- Refactoring suggestions

Review generated code before accepting it.

For important behavior, especially authorization, persistence, and file handling, verify the implementation manually and with tests.

---

## Communication

For each major task, briefly report:

```text
Changed:
- ...

Verified:
- ...

Remaining:
- ...
```

If something is uncertain, say so instead of guessing.

### Golden Rule

**Inspect → Understand → Implement → Verify → Report**

Never:

**Assume → Generate → Claim it works**

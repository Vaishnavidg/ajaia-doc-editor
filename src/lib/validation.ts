import { z } from "zod";

export const MAX_TITLE_LENGTH = 200;
export const MAX_CONTENT_BYTES = 1_000_000; // 1 MB of HTML
export const MAX_IMPORT_BYTES = 1_000_000; // 1 MB uploaded file
export const SUPPORTED_IMPORT_EXTENSIONS = [".txt", ".md"] as const;

export const createDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters`)
    .optional(),
});

export const updateDocumentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters`)
      .optional(),
    content: z
      .string()
      .max(MAX_CONTENT_BYTES, "Document content is too large")
      .optional(),
  })
  .refine((data) => data.title !== undefined || data.content !== undefined, {
    message: "Provide a title or content to update",
  });

export const shareDocumentSchema = z.object({
  userId: z
    .string({ error: "Select a user to share with" })
    .min(1, "Select a user to share with"),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type ShareDocumentInput = z.infer<typeof shareDocumentSchema>;

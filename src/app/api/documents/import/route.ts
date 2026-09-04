import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { toErrorResponse, ValidationError } from "@/lib/errors";
import { importDocument } from "@/lib/documents";
import { MAX_IMPORT_BYTES } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      throw new ValidationError("Expected a multipart form upload");
    }
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ValidationError("No file provided");
    }
    if (file.size > MAX_IMPORT_BYTES) {
      throw new ValidationError("File is too large. Maximum is 1 MB.");
    }

    const text = await file.text();
    const document = await importDocument(user.id, {
      name: file.name,
      size: file.size,
      text,
    });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

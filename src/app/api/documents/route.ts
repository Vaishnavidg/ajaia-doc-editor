import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";
import { createDocument, listDocumentsForUser } from "@/lib/documents";
import { createDocumentSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const documents = await listDocumentsForUser(user.id);
    return NextResponse.json(documents);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = createDocumentSchema.parse(await request.json().catch(() => ({})));
    const document = await createDocument(user.id, body);
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

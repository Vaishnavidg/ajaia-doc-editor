import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";
import {
  deleteDocument,
  getDocumentForUser,
  updateDocument,
} from "@/lib/documents";
import { updateDocumentSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const document = await getDocumentForUser(user.id, id);
    return NextResponse.json({ document });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const body = updateDocumentSchema.parse(await request.json());
    const document = await updateDocument(user.id, id, body);
    return NextResponse.json({ document });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    await deleteDocument(user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

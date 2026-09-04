import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";
import { addShare } from "@/lib/documents";
import { shareDocumentSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const body = shareDocumentSchema.parse(await request.json());
    const document = await addShare(user.id, id, body);
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

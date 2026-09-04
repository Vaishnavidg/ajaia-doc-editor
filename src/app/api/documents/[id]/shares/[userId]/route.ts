import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";
import { removeShare } from "@/lib/documents";

type Context = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const { id, userId } = await params;
    const user = await getCurrentUser();
    const document = await removeShare(user.id, id, userId);
    return NextResponse.json({ document });
  } catch (error) {
    return toErrorResponse(error);
  }
}

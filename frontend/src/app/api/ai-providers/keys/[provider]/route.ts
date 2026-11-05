import { NextResponse } from "next/server";

import { createTextProxyResponse, fetchBackend } from "@/server/backend-api";
import { getServerSession } from "@/server/session";

type Params = { params: Promise<{ provider: string }> };

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await params;
  const upstream = await fetchBackend(`/ai-providers/keys/${encodeURIComponent(provider)}`, {
    method: "PUT",
    userId: session.user.id,
    extraHeaders: { "Content-Type": "application/json" },
    body: (await request.text()) || "{}",
    cache: "no-store",
  });

  return createTextProxyResponse(upstream);
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await params;
  const upstream = await fetchBackend(`/ai-providers/keys/${encodeURIComponent(provider)}`, {
    method: "DELETE",
    userId: session.user.id,
    cache: "no-store",
  });

  return createTextProxyResponse(upstream);
}

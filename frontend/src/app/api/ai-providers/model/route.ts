import { NextResponse } from "next/server";

import { createTextProxyResponse, fetchBackend } from "@/server/backend-api";
import { getServerSession } from "@/server/session";

export async function PUT(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const upstream = await fetchBackend("/ai-providers/model", {
    method: "PUT",
    userId: session.user.id,
    extraHeaders: { "Content-Type": "application/json" },
    body: (await request.text()) || "{}",
    cache: "no-store",
  });

  return createTextProxyResponse(upstream);
}

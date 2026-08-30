import "server-only";

import {
  parsePhiBuilderPreviewSnapshot,
} from "./plugins/runtime-modules/builder/preview-transport";
import {
  savePhiBuilderPreviewSnapshot,
} from "./plugins/runtime-modules/builder/preview-store";

type PhiBuilderApiRouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

async function savePreviewSnapshot(request: Request) {
  const snapshot = parsePhiBuilderPreviewSnapshot(await request.text());
  if (!snapshot) {
    return Response.json(
      { error: "Invalid builder preview snapshot." },
      { status: 400 },
    );
  }

  return Response.json({
    id: savePhiBuilderPreviewSnapshot(snapshot),
  });
}

export async function POST(request: Request, context: PhiBuilderApiRouteContext) {
  const { path = [] } = await context.params;

  if (path.length === 1 && path[0] === "preview") {
    return savePreviewSnapshot(request);
  }

  return Response.json(
    { error: "Unknown builder API endpoint." },
    { status: 404 },
  );
}

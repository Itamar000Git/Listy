import "server-only";

import { internalError } from "@/lib/api/respond";
import { authenticateFamily } from "@/lib/api/authenticate";
import { buildFamilyExport } from "@/lib/backup/export-family";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authenticateFamily(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const backup = await buildFamilyExport(auth.familyId);
    return Response.json(backup);
  } catch {
    return internalError();
  }
}

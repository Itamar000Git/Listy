import "server-only";

import { badRequest, internalError } from "@/lib/api/respond";
import { authenticateFamily } from "@/lib/api/authenticate";
import { backupExportSchema } from "@/lib/validation/schemas";
import { SUPPORTED_BACKUP_SCHEMA_VERSIONS } from "@/lib/backup/schema-version";
import { importFamilyBackup } from "@/lib/backup/import-family";

export const runtime = "nodejs";

/**
 * Imports a backup as new copies under the authenticated family
 * (specification §27). Ownership is always the verified token's
 * familyId — nothing in the uploaded file can target another family.
 */
export async function POST(request: Request) {
  const auth = await authenticateFamily(request);
  if ("errorResponse" in auth) return auth.errorResponse;
  const { familyId } = auth;

  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return badRequest("invalid_json");
  }

  const parsed = backupExportSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("invalid_backup_file");
  }

  if (!SUPPORTED_BACKUP_SCHEMA_VERSIONS.includes(parsed.data.schemaVersion as 1)) {
    return badRequest("unsupported_schema_version");
  }

  try {
    const summary = await importFamilyBackup(familyId, parsed.data);
    return Response.json({ ok: true, ...summary });
  } catch {
    return internalError();
  }
}

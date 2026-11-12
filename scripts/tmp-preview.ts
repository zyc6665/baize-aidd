// Temporary: preview one draft source from a JSON file, so a selector can be tried before it is seeded.
// Usage (inside api container): node scripts/tmp-preview.ts <id> <kind> <config.json>
import { readFileSync } from "node:fs";
import { previewSource } from "@aihot/backend/admin/sources";
import { closeDb } from "@aihot/backend/db";

const [id, kind, file] = process.argv.slice(2);
if (!id || !kind || !file) {
  console.error("usage: node scripts/tmp-preview.ts <id> <kind> <config.json>");
  process.exit(1);
}

try {
  const config = JSON.parse(readFileSync(file, "utf8"));
  const preview = await previewSource({ id, kind: kind as never, config });
  console.log(JSON.stringify({ count: preview.count, ms: preview.ms, items: preview.items.slice(0, 6) }, null, 2));
} catch (error) {
  console.error("PREVIEW FAILED:", error instanceof Error ? error.message : String(error));
} finally {
  await closeDb();
}

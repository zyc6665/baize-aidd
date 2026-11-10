// 把 industry/sources.json 里的抓取间隔同步到已经入库的源。
// 只改 interval_minutes，其它字段（tier、config、开关）一概不碰：那些改动要走后台或 seed 新建。
// 用法：node scripts/retune.ts [--dry]
import { readFileSync } from "node:fs";
import { sql } from "@aihot/backend/db";

interface PackSource {
  id: string;
  name?: string;
  interval_minutes?: number;
}

const dry = process.argv.includes("--dry");
const pack = JSON.parse(readFileSync("industry/sources.json", "utf8")) as { sources: PackSource[] };

const rows = await sql<{ id: string; interval_minutes: number }[]>`SELECT id, interval_minutes FROM sources`;
const current = new Map(rows.map((r) => [r.id, r.interval_minutes]));

const changes = pack.sources
  .filter((s) => typeof s.interval_minutes === "number" && current.has(s.id) && current.get(s.id) !== s.interval_minutes)
  .map((s) => ({ id: s.id, from: current.get(s.id) as number, to: s.interval_minutes as number }));

const missing = pack.sources.filter((s) => !current.has(s.id)).map((s) => s.id);

if (changes.length === 0) {
  console.log(`抓取间隔已一致：${pack.sources.length} 个源，没有需要改的。`);
} else {
  console.log(`${dry ? "将要改" : "改"} ${changes.length} 个源的抓取间隔：`);
  for (const c of changes) console.log(`  ${c.id}: ${c.from} → ${c.to} 分钟`);
  if (!dry) {
    for (const c of changes) await sql`UPDATE sources SET interval_minutes = ${c.to}, updated_at = now() WHERE id = ${c.id}`;
  }
}
if (missing.length > 0) console.log(`清单里这 ${missing.length} 个源还没入库（用 scripts/seed.ts 新建）：${missing.join("、")}`);
process.exit(0);

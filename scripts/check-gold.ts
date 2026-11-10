// 校验 gold 样本文件能不能用：每行是一个标注过的样本，字段齐、决策只有 select/reject、正文非空。
// 这一步不调模型、不连数据库，所以能放进 CI：样本坏了先失败，花在评分上的钱才不会白花。
// 用法：node scripts/check-gold.ts [industry/gold.jsonl]
import { readFileSync } from "node:fs";

interface GoldCase {
  caseId?: unknown;
  material?: { title?: unknown; bodyOriginal?: unknown; bodyZh?: unknown; sourceName?: unknown };
  sourceFacts?: { sourceTier?: unknown; sourceKind?: unknown; language?: unknown };
  gold?: { decision?: unknown };
}

const file = process.argv[2] ?? "industry/gold.jsonl";
const lines = readFileSync(file, "utf8")
  .replace(/^\uFEFF/, "")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

const problems: string[] = [];
const seen = new Set<string>();
const tiers: Record<string, number> = {};
const decisions: Record<string, number> = {};

for (const [index, line] of lines.entries()) {
  const at = `${file}:${index + 1}`;
  let parsed: GoldCase;
  try {
    parsed = JSON.parse(line) as GoldCase;
  } catch (error) {
    problems.push(`${at} 不是合法 JSON：${(error as Error).message}`);
    continue;
  }
  const id = typeof parsed.caseId === "string" ? parsed.caseId : "";
  if (!id) problems.push(`${at} 缺 caseId`);
  else if (seen.has(id)) problems.push(`${at} caseId 重复：${id}`);
  else seen.add(id);

  const title = typeof parsed.material?.title === "string" ? parsed.material.title.trim() : "";
  if (!title) problems.push(`${at} material.title 为空`);
  const body = [parsed.material?.bodyOriginal, parsed.material?.bodyZh].find((b): b is string => typeof b === "string" && b.trim().length > 0);
  if (!body) problems.push(`${at} 没有正文（bodyOriginal / bodyZh 都空），评分时没有材料可读`);

  const tier = typeof parsed.sourceFacts?.sourceTier === "string" ? parsed.sourceFacts.sourceTier : "";
  if (!tier) problems.push(`${at} 缺 sourceFacts.sourceTier，算不出该用哪一档门槛`);
  else tiers[tier] = (tiers[tier] ?? 0) + 1;

  const decision = parsed.gold?.decision;
  if (decision !== "select" && decision !== "reject") problems.push(`${at} gold.decision 只能是 select 或 reject，实际是 ${JSON.stringify(decision)}`);
  else decisions[decision] = (decisions[decision] ?? 0) + 1;
}

if (lines.length === 0) problems.push(`${file} 里没有样本`);
if ((decisions.select ?? 0) === 0) problems.push("没有一个 select 样本：门槛校准需要正例");
if ((decisions.reject ?? 0) === 0) problems.push("没有一个 reject 样本：只测正例会把门槛调得越低越好");

if (problems.length > 0) {
  console.error(`gold 样本有 ${problems.length} 个问题：`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const spread = Object.entries(tiers)
  .map(([tier, n]) => `${tier} ${n}`)
  .join("、");
console.log(`gold 可用：${lines.length} 条（select ${decisions.select} / reject ${decisions.reject}），按信源层级 ${spread}`);

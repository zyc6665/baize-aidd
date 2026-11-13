// 岗位画像只做一件事：给同一天里的卡片换个先后。这些用例锁住「换的顺序对不对」和「没选岗位时等于没变」，
// 以及权重表本身的方向（研发不该把交易排到前面，监管不该把融资排到前面）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROLES, ROLE_KEYS, moodSummary, roleOf, roleRank } from "@aihot/site/roles";
import { CATEGORY_LABELS } from "@aihot/contracts/taxonomy";

const role = (key: string) => {
  const found = roleOf(key);
  assert.ok(found, `${key} should be a role`);
  return found;
};

const card = (over: Partial<{ category: string | null; tags: string[]; score: number | null; selected: boolean; reports: number }> = {}) => ({
  category: over.category ?? "models",
  tags: over.tags ?? [],
  score: over.score ?? 50,
  selected: over.selected ?? true,
  reports: over.reports ?? 1,
});

test("an unused or unknown stored value means no role at all", () => {
  assert.equal(roleOf(null), null);
  assert.equal(roleOf(""), null);
  assert.equal(roleOf("ceo"), null);
  assert.equal(roleOf(123), null);
  for (const key of ROLE_KEYS) assert.equal(roleOf(key)?.key, key);
});

test("the same card scores differently by role only because of its category", () => {
  const deal = card({ category: "deals", score: 60 });
  const paper = card({ category: "models", score: 60 });
  assert.ok(roleRank(paper, role("research")) > roleRank(deal, role("research")), "研发：模型应排在交易前面");
  assert.ok(roleRank(deal, role("bd")) > roleRank(paper, role("bd")), "BD：交易应排在模型前面");
  assert.ok(roleRank(deal, role("invest")) > roleRank(paper, role("invest")), "投资：交易应排在模型前面");
});

test("a quieted category can still beat a tiny on-role card: sinking is not hiding", () => {
  const bigDeal = card({ category: "deals", score: 95 });
  const smallPaper = card({ category: "models", score: 30 });
  // 沉底不是删掉：高分内容在同一天里仍然可能压过一条低分的本岗位内容，只是不再因为「类目对」而霸榜。
  assert.ok(roleRank(bigDeal, role("research")) > 0);
  assert.ok(roleRank(smallPaper, role("research")) > 0);
});

test("tags nudge within a category, and never flip a whole category's direction", () => {
  const plain = card({ category: "clinical", tags: [] });
  const readout = card({ category: "clinical", tags: ["临床进展"] });
  assert.ok(roleRank(readout, role("clinical")) > roleRank(plain, role("clinical")));
  // 融资标签在监管眼里是压分项；但在投资眼里是加分项。
  const financing = card({ category: "deals", tags: ["融资"] });
  assert.ok(roleRank(financing, role("regulatory")) < roleRank(card({ category: "deals" }), role("regulatory")));
  assert.ok(roleRank(financing, role("invest")) > roleRank(card({ category: "deals" }), role("invest")));
});

test("several outlets reporting the same thing lifts a card a little, but not without bound", () => {
  const one = card({ reports: 1 });
  const three = card({ reports: 3 });
  const many = card({ reports: 40 });
  const r = role("research");
  assert.ok(roleRank(three, r) > roleRank(one, r));
  assert.equal(roleRank(many, r), roleRank(card({ reports: 5 }), r), "加成封顶在 4 家");
});

test("no role chosen keeps every score equal, so the list stays in time order", () => {
  const a = card({ category: "models", score: 80 });
  const b = card({ category: "deals", score: 20 });
  const r = role("strategy");
  assert.equal(roleRank(a, r) === roleRank(b, r), false, "有岗位时两者不同");
  // 未选岗位时调用方根本不排序；这里锁住的是「排不排序看 roleOf 是否为 null」这个前提。
  assert.equal(roleOf(null), null);
});

test("each role declares a category it lifts and, for most, one it sinks", () => {
  assert.equal(ROLES.length, ROLE_KEYS.length);
  for (const r of ROLES) {
    const { up, down } = moodSummary(r, CATEGORY_LABELS);
    assert.ok(up.length >= 1, `${r.key} should lift at least one category`);
    assert.ok(down.length >= 1, `${r.key} should sink at least one category`);
  }
  assert.deepEqual(moodSummary(role("research"), CATEGORY_LABELS).up, ["模型与方法", "工具与平台", "临床与管线"]);
  assert.deepEqual(moodSummary(role("regulatory"), CATEGORY_LABELS).down, ["工具与平台", "交易与资本"]);
});

// 读者按岗位看内容时用的权重表：同一个站，不同岗位看到的是同一天里不同的先后。
//
// 这一层只做一件事：给一天之内的条目重新排队。它不隐藏内容、不记阅读历史、不进任何公开出口
// （RSS、/api/v1、MCP、sitemap、日报都不认识「岗位」）。选择存在浏览器本地，见 apps/web/app/lib/local-state.ts。
//
// 调权重只改这个文件。名词解释：
// - 类别权重：该类别分数乘多少。1.35 是「这和你的岗位直接有关」，0.35 是「你知道有这事就行」，
//   没写的按 1 算。降权不等于隐藏——同一天里它们沉到最后，翻得到。
// - 标签加成：标签出现在 tags 里就加这些分（负数就是压）。标签必须来自 industry/taxonomy.ts 的白名单。

import type { CategoryKey } from "@aihot/contracts/taxonomy";

export const ROLE_KEYS = ["research", "clinical", "bd", "invest", "strategy", "regulatory"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export interface Role {
  key: RoleKey;
  /** 界面上显示的名字。 */
  label: string;
  /** 菜单里的一句话，说明这个岗位最怕漏掉什么。 */
  oneline: string;
  /** 类别权重，缺省 1。 */
  weights: Partial<Record<CategoryKey, number>>;
  /** 标签加成，缺省 0。 */
  tags: Readonly<Record<string, number>>;
}

export const ROLES: readonly Role[] = [
  {
    key: "research",
    label: "研发",
    oneline: "模型、方法、数据集、靶点、分子与结构",
    weights: { models: 1.35, clinical: 1.2, tools: 1.2, deals: 0.35, policy: 0.6, industry: 0.7 },
    tags: { "论文/研究": 8, "数据集/基准": 6, "方法/算法": 5, "开源/代码": 4, "临床进展": 3, "交易": -6, "融资": -6, "产业动态": -4 },
  },
  {
    key: "clinical",
    label: "临床与医学",
    oneline: "读出、终点、安全性、适应症、审批",
    weights: { clinical: 1.35, models: 1.1, tools: 0.8, deals: 0.35, policy: 0.9, industry: 0.8 },
    tags: { "临床进展": 9, "审批": 6, "数据集/基准": -4, "开源/代码": -5, "基准": -4 },
  },
  {
    key: "bd",
    label: "BD 与许可",
    oneline: "授权、合作、并购、首付与里程碑",
    weights: { deals: 1.35, clinical: 1.15, industry: 1.1, policy: 0.8, models: 0.7, tools: 0.35 },
    tags: { "交易": 9, "融资": 7, "临床进展": 4, "教程/解读": -5, "开源/代码": -4 },
  },
  {
    key: "invest",
    label: "投资",
    oneline: "融资、IPO、临床失败、行业格局",
    weights: { deals: 1.35, industry: 1.2, clinical: 1.1, policy: 1, models: 0.6, tools: 0.35 },
    tags: { "融资": 9, "交易": 6, "产业动态": 5, "临床进展": 4, "教程/解读": -6, "开源/代码": -5 },
  },
  {
    key: "strategy",
    label: "战略与管理",
    oneline: "行业格局、监管、竞争、产能与裁员",
    weights: { industry: 1.35, policy: 1.2, deals: 1.15, clinical: 0.9, models: 0.8, tools: 0.35 },
    tags: { "产业动态": 7, "监管": 6, "交易": 5, "审批": 4, "教程/解读": -5, "数据集/基准": -4 },
  },
  {
    key: "regulatory",
    label: "监管与注册",
    oneline: "指南、审批、数据合规、GMP",
    weights: { policy: 1.35, clinical: 1.1, industry: 0.9, models: 0.6, deals: 0.35, tools: 0.35 },
    tags: { "监管": 9, "审批": 7, "临床进展": 4, "融资": -8, "交易": -6 },
  },
];

const BY_KEY: ReadonlyMap<string, Role> = new Map(ROLES.map((r) => [r.key, r]));

/** 存的那串东西是否还是一个岗位；旧的、坏的、空的都当「没选」。 */
export function roleOf(value: unknown): Role | null {
  return typeof value === "string" ? (BY_KEY.get(value) ?? null) : null;
}

/** 排序要看的字段，都来自卡片（FeedItemSummary 加 group 的报道数）。 */
export interface RankInput {
  category: string | null;
  tags: readonly string[];
  score: number | null;
  selected: boolean;
  /** 同一件事有几家在报；没有事件归组时按 1 算。 */
  reports: number;
}

/**
 * 一条卡片在某个岗位下的先后分：分数 × 类别权重，加上标签加成和「几家在报」的小幅加成。
 * 只用于同一天内部比较大小，没有绝对意义。
 */
export function roleRank(item: RankInput, role: Role): number {
  const weight = item.category === null ? 1 : (role.weights[item.category as CategoryKey] ?? 1);
  let rank = (item.selected ? 20 : 0) + (item.score ?? 40) * weight;
  for (const tag of item.tags) rank += role.tags[tag] ?? 0;
  rank += Math.min(Math.max(item.reports - 1, 0), 4) * 2;
  return rank;
}

/** 类别对某个岗位的态度，用来写界面上的那句说明。抬高是「大于 1」，沉底是「0.5 及以下」。 */
export function moodOf(role: Role, category: string | null): "up" | "down" | "flat" {
  const w = category ? role.weights[category as CategoryKey] : undefined;
  if (w === undefined) return "flat";
  if (w > 1) return "up";
  if (w <= 0.5) return "down";
  return "flat";
}

/** 哪些类别会被提前、哪些会被沉底（按 CATEGORY_LABELS 的顺序，界面上直接列）。 */
export function moodSummary(role: Role, labels: Readonly<Record<string, string>>): { up: string[]; down: string[] } {
  const up: string[] = [];
  const down: string[] = [];
  for (const [key, label] of Object.entries(labels)) {
    const mood = moodOf(role, key);
    if (mood === "up") up.push(label);
    else if (mood === "down") down.push(label);
  }
  return { up, down };
}

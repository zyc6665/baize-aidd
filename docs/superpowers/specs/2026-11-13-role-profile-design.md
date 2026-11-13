# 岗位画像（Role Profile）设计

日期：2026-11-13
状态：待批准
背景：用户要求「增加功能，确保品牌辨识度，而不是只像在用人家的引擎」。已确认的方向是**按职业岗位给同一批内容换配比**，角色只存本地，不建账号。

## 1. 要解决的问题

同一个首页，高管要看的是行业格局、交易、监管、竞争动态；研发要看的是模型、方法、数据集、靶点、临床读出。现在两者拿到的是同一份按时间排的列表，谁都得自己过滤。

做完之后：第一次来时选一次「我是哪类人」，之后每次打开，头版默认按这类人的关注点排；与本岗位无关的内容**不消失，但沉到最后**。

## 2. 六类角色

| key | 名称 | 一句话 | 加权类别 | 减权类别 |
|---|---|---|---|---|
| `research` | 研发 | 模型、方法、数据集、靶点、分子与结构 | models、clinical、tools | deals、policy |
| `clinical` | 临床与医学 | 读出、终点、安全性、适应症、审批 | clinical、models | deals、tools |
| `bd` | BD 与许可 | 授权、合作、并购、首付与里程碑 | deals、clinical、industry | tools、policy |
| `invest` | 投资 | 融资、IPO、临床失败、行业格局 | deals、industry、clinical | tools、policy |
| `strategy` | 战略与管理 | 行业格局、监管、竞争、产能与裁员 | industry、policy、deals | tools |
| `regulatory` | 监管与注册 | 指南、审批、数据合规、GMP | policy、clinical | deals、tools |

未选角色时行为完全不变（按时间）。

## 3. 排序怎么算

不调模型、不建推荐服务。只用卡片上已有的字段：`item.category`、`item.tags`、`item.score`、`item.selected`、`group.reportCount`。

```
roleRank(card, role) =
    (card.item.selected ? 20 : 0)
  + (card.item.score ?? 40) * weight(role, card.item.category)     // 0.35 / 1 / 1.35
  + Σ tagBoost(role, tag)                                          // -8 … +10
  + (card.group ? min(card.group.reportCount - 1, 4) * 2 : 0)       // 多家在报，稍微往上
```

排序规则：**先按天分组，天与天之间不动**（同一天仍然是同一天）；在天内按 `roleRank` 降序，同分按 `anchorAt` 降序。

「强降权」落在 `weight`：本岗位相关 1.35、无关 0.35、其余 1。减权不等于隐藏——同一天里它们会沉到部门尾部，翻得到。

`tagBoost` 只认 `industry/taxonomy.ts` 里已有的标签（不新造词），例如：

| 角色 | 加成 | 降权 |
|---|---|---|
| 研发 | 论文/研究 +8、数据集/基准 +6、预印本 +5、开源/代码 +4 | 财报 +(-6) |
| 临床与医学 | 临床进展 +8、审批 +6 | 基准 +(-4) |
| BD 与许可 | 交易 +8、融资 +6 | 教程/解读 +(-4) |
| 投资 | 融资 +8、交易 +5 | 教程/解读 +(-6) |
| 战略与管理 | 产业动态 +6、监管 +5 | 教程/解读 +(-4) |
| 监管与注册 | 监管 +9、审批 +7 | 融资 +(-8) |

天与天之间不动，是为了不让人失去「这是哪天的事」；排序只发生在同一天内部。

## 4. 界面

1. **入口**：信息流工具条上一个 chip，写着「按岗位：研发 ▾」。点开是一列：研发 / 临床与医学 / BD 与许可 / 投资 / 战略与管理 / 监管与注册 / 不按岗位。
2. **第一次来**：信息流上方一条可关闭的横条：「你主要看哪一块？选一次，以后按你的岗位排。」点开同一个菜单。选了或关了就永不再出现（本地记一笔）。
3. **选中后**：chip 变成强调色，头版副标题加一句「按研发排」。工具条可展开一行说明：哪些类别被提前、哪些被沉底。读者随时能点回「不按岗位」。
4. 卡片本身不改，仍然显示分数、标签、来源——排序变化不隐藏证据。

## 5. 存在哪

`localStorage` 一个键：`baize:role`，值 `research|clinical|bd|invest|strategy|regulatory`，缺省即未选。走 `apps/web/app/lib/local-state.ts` 已有的 key 表，读写在客户端。

- 不进 cookie、不进请求头、不进服务端缓存键。
- 服务端渲染的 HTML 与所有公开出口（RSS、`/api/v1`、MCP、sitemap、日报/周报/月报）**一律不感知角色**：匿名、一致、可缓存。
- 换设备要重选一次——这是有意的取舍，等真有人抱怨再谈账号。

## 6. 落在哪个文件

| 文件 | 改动 |
|---|---|
| `site/roles.ts` | 新增。导出 `ROLES`、`ROLE_KEYS`、`roleOf(key)`、`roleRank(card, role)`（纯函数，可测） |
| `apps/web/app/lib/local-state.ts` | `KEYS` 加 `role`、`roleHint`（横条是否已关） |
| `apps/web/app/lib/role.ts` | 新增。`useRole()` 读本地状态并在变化时触发重渲染（与主题同一套写法） |
| `apps/web/app/features/feed/Timeline.tsx` | 分组排序处：`byBeijingDay(...)` 之后按 `roleRank` 在天内重排；顶部插入横条与 chip |
| `apps/web/app/features/feed/RoleChip.tsx` | 新增。工具条上的 chip 与菜单 |
| `site/roles.test.ts` 或 `tests/role-profile.test.ts` | 新增。纯函数测试：权重方向、天内不乱序、未选角色等价于旧顺序 |

## 7. 不做什么

- 不建账号、不做注册登录、不收邮箱。
- 不做协同过滤、不记录阅读历史、不回传点击。
- 不让角色影响任何公开出口。
- 不做「智能体知识库」——那是另一个项目，要花模型钱，且需要单独的预算与回执设计。

## 8. 怎么验证

1. `npm run typecheck`、`npm run build -w @aihot/web` 通过。
2. 单测：同一批卡片，`research` 下 models/clinical 上浮、deals/policy 沉底；`strategy` 相反；未选角色时顺序与改动前逐条一致。
3. 页面：选中「研发」后刷新，头版第一条不再是纯交易；`/all` 同源同样生效；点「不按岗位」恢复时间序。
4. 公开出口不变：`/feed.xml`、`/api/v1/items`、`/sitemap.xml` 与改动前一致（`git diff` 上看不到这些文件）。
5. `node scripts/smoke.ts` 全过。

## 9. 风险与本轮不解决的部分

- **看得出「换了个顺序」但看不出「为什么」**：第一版用工具条那行说明兜住；如果读者仍然困惑，下一步做「按岗位的原因标签」（要改卡片文案，成本更高）。
- **角色选错**：随时可换，不记历史。
- **内容量不足时排序没意义**：某天只有 3 条时，岗位排序几乎看不出差别——这是内容量问题，不是排序问题。

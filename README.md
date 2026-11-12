# 白泽智药 · Baize

AI 药物研发（AIDD）行业热点站。盯住一批期刊、预印本、官方公告、产业媒体和公司博客，把同一件事的多篇报道归到一起，落在网页上，每天 08:00 出一份日报。

线上：<http://localhost:3000>（本地部署）。后台：`/admin`。

## 这个站是什么

- **宽召回，再排序。** 真事基本都进「全部动态」（`browseFloor` 25），再按信源分级卡精选门槛（T1 36 / T1_5 38 / T2 40）。重要的排在前面，边角料留在列表里而不是被挡在门外。
- **七类内容。** 模型与方法、工具与平台、临床与管线、交易与资本、政策与监管、产业与生态、观点与分析。
- **中文输出，英文原文保留专名。** 靶点（KRAS G12D）、模型（AlphaFold3 / ESM3 / Boltz-2）、缩写（ADMET、ORR、PFS）都不翻译。
- **同一件事只占一个位置。** 事件归组之后再算热度，48 小时内同一个独立来源只算一次，24 小时以内的加权。
- **旧文不刷屏。** 发现时已经发布超过 48 小时的内容，按原文时间归档，不会顶掉今天的头条。

对外出口都只读 `packages/backend/src/publication/`：网页、RSS（`/feed.xml`、`/feed/category/<key>.xml`）、`/api/v1`、MCP、`llms.txt`、`sitemap.xml`、分享图。

## 跑起来

需要 Docker，和一个 OpenAI 兼容的模型接口。

```bash
cp .env.example .env      # 或 node scripts/init-env.ts --llm-key <key>
docker compose up -d --build
```

`.env` 里这几项是这个站的关键：

| 变量 | 说明 |
|---|---|
| `SITE_URL` | 对外网址，RSS / sitemap / 分享图里的绝对链接都靠它 |
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | 模型接口。模型跑在宿主机上时用 `http://host.docker.internal:<port>/v1`（容器里的 `127.0.0.1` 是容器自己） |
| `LLM_REASONING_TOKENS` | 用会先想再答的模型时必须设（现在 4000），否则推理把输出额度吃光，评分会成片失败（`finish_reason=length`） |
| `COLLECT_ENABLED` / `MODEL_CALLS_ENABLED` | 两个安全阀，只有写成 `true` 才真的抓取和调模型 |
| `ADMIN_PASSWORD` | 后台密码，首次启动前改掉 |

线程模型：`api`（对外接口与后台）、`worker`（抓取、评分、归组、出刊）、`web`（React Router SSR）三个进程 + PostgreSQL。`worker` 挂了不会丢数据，重启后从队列里继续。

## 目录

改造过的东西都在这两个文件夹里，引擎代码基本没动：

```
industry/
  taxonomy.ts      分类、标签、主题词表、实体词表
  topics.json      主题页（公司 15 / 技术方向 12 / 内容形态 10）
  sources.json     信源（首次启动导入，已存在的不覆盖）
  selection.ts     门槛
  prompts/         31 个提示词：预筛、评分、理解、归组、写作、翻译
site/
  site.ts          站名、文案、出刊时间、页脚
  brand/           logo、图标、报头（nameplates）
  pages/           使用规则、隐私说明
  public/          robots.txt、manifest、openapi
docs/              引擎文档（信源配置、精选与校准、事件归组、部署、架构）
packages/ apps/    引擎本体
```

## 日常运维

**加一个信源。** 先确认它拿得到东西——用框架自己的解析器预演一遍，返回 200、有条目、带日期才写进清单（`node scripts/preview-rss.mjs` 那种一次性脚本，跑完删掉）。然后写进 `industry/sources.json`，跑 `docker compose exec -T api node scripts/seed.ts`（只补新的，不动已有的）；只想试选择器就在后台「信源」页预览。

**抓取间隔是分层的。** 变化快的跑得勤，慢站别浪费请求：监管与公司官方 120–240 分钟，中文媒体 60–240，期刊与预印本 360–480，更新慢的站 480–720。`sources.json` 里的间隔对**已入库**的源不生效（seed 不覆盖已有行），改完要跑 `docker compose exec -T api node scripts/retune.ts` 同步；加 `--dry` 先看要改哪几个。现在 38 个源里最快的是药时代（60 分钟），最慢的是 Labiotech 与 Cradle 博客（720 分钟）。

**手动抓一次。** `docker compose exec -T api node scripts/collect.ts <source-id>`。

**改了门槛要回写。** `p.selected` 是发布时派生出来的，改完 `industry/selection.ts` 只影响新内容；老数据要按新门槛回写 `analyses.selected` 再重新发布，否则列表和精选会对不上。

**换模型或改评分提示词前先跑校准。** `scripts/eval-selection.ts` 配 `.data/gold.jsonl`（格式见 `industry/gold.example.jsonl`）。2026-11 这次校准的结论是：这个评分模型给分偏保守（真事 40–60，噪声 12–30），所以门槛从 50/55/65 降到 36/38/40（媒体门槛仍高于官方，代价是 T2 召回约 70%），T1 召回从 26% 拉到 100%。换了模型就必须重跑。标注样本存在 `industry/gold.jsonl`，`npm run check:gold` 会先检查它的格式（CI 每次都跑），再跑 `scripts/eval-selection.ts` 出分。

**看哪里出问题。** 后台「抓取」「模型调用」两页有每次请求的回执和失败原因；`docker compose logs -f worker` 是原始日志。

**读者订阅（邮件日报）。** `/subscribe` 收集邮箱，订阅者收到确认信、点链接确认后，每天 08:20 收到当天日报的邮件（`ops.subscribers`）。发信走 `MAIL_API_URL` / `MAIL_API_KEY` / `MAIL_FROM` 三项配置的 HTTP 接口（任何事务邮件服务都行）；三项没配时流程照常走，但信只会写进容器里的 `/data/mail/`，本机调试就靠它看排版和链接。确认链接 7 天有效，退订链接一下即退（`subscribers.unsubscribed_at`），退订后再订阅要重新确认一次。

## 文档

`docs/` 下是引擎文档，仍然适用：信源六种配法（`sources.md`）、精选与校准（`selection.md`）、事件归组（`grouping.md`）、部署与备份（`deploy.md`）、架构与不变规则（`architecture.md`）。

## 许可与致谢

本站的引擎来自 [AIHOT](https://github.com/KKKKhazix/AIHOT)（MIT）。站名、分类体系、信源、提示词与品牌资产是本站自己的内容。

上游明确把「AIHOT」这个名字和它的图形标识排除在 MIT 授权之外，本站已换成自己的名字、图标和主色。完整的授权说明见 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)。

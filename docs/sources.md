# 信源

白泽智药盯的是 AI 药物研发：结构预测与分子生成的新模型、管线的临床读出、监管决定、交易与合作。本站清单里有 41 个信源，在后台「信源」页里看得见、改得动；`industry/sources.json` 只是首次部署时导入的清单，之后以库里的行为准。

信源决定这个站的下限：源选错了，后面的筛选、写作、归组都救不回来。下面按「现在跑什么」→「六种收法」→「加源前怎么验」→「怎么上库和调间隔」写。

## 本站现在跑哪些源

| 门类 | 在跑的源 | 抓取间隔 |
|---|---|---|
| 期刊与预印本（15） | Nature 系 11 个（Nature、Nature Biotechnology、Nature Machine Intelligence、Nature Reviews Drug Discovery、Nature Methods、Nature Computational Science、npj Drug Discovery、npj Digital Medicine、Nature 的计算生物学/机器学习/药物发现三个主题源）、bioRxiv（全部、生物信息、药理与毒理）、medRxiv、arXiv q-bio | 180–360 分钟 |
| 监管（3） | FDA 新闻稿、FDA 药品新闻、FDA MedWatch 安全通告 | 180–360 分钟 |
| 公司一手与机构（9） | Google DeepMind、NVIDIA 生成式 AI、Microsoft Research、晶泰科技、AbCellera、Cradle、Broad Institute、Chan Zuckerberg Biohub、MIT News · AI | 120–720 分钟 |
| 产业媒体（10） | STAT、Endpoints、BioPharma Dive、PharmaVoice、Labiotech、GEN、PharmaTimes、Science News、药时代、Owl Posting | 60–480 分钟 |
| 中文站（4） | 中国食品药品网 · 新药研发、生物谷资讯、药智网新闻、动脉网 · 资讯 | 120–240 分钟 |

选源的理由：

- **期刊与预印本**给出「有新模型/新读出」的最早信号。bioRxiv、medRxiv 比期刊早几个月；Nature 系与 arXiv q-bio 补上经过审稿或方法学更完整的一侧。读的是论文本身，不是媒体的二手总结。
- **监管**是一手事实：批件、完整回应函、安全性沟通先从 FDA 的订阅里出，不等媒体报道。
- **公司一手与机构**决定数字：模型权重、平台能力、合作条款、管线里程碑，以发布方自己那条为准；媒体转述经常丢掉关键数字。
- **产业媒体**提供背景、引语和行业反应，也常常比一手发布早几小时（STAT、Endpoints 尤其快）。
- **中文站**补国内审评、临床与产业动态，英文源覆盖不到。

清单里没有 Fierce、BioSpace、NMPA、CDE、EMA、ChemRxiv：它们的订阅或列表拿不到可用条目，别按印象加回来。

## 六种信源

| kind | 用来收什么 | 本站 |
|---|---|---|
| `rss` | 有稳定订阅源的媒体、期刊、公司博客 | 34 个，主力 |
| `web_list` | 只有列表页、没有 RSS 的站 | 4 个 |
| `json_list` | 接口返回 JSON 的站 | 暂未使用 |
| `x_search` | 按关键词或账号搜 X | 暂未使用（需要 SocialData 的 key） |
| `mp_account` | 微信公众号 | 暂未使用（需要 Dajiala 的 key） |
| `external` | 自己的脚本或爬虫推过来 | 暂未使用（需要 `INGEST_TOKEN`） |

每种 kind 只认自己那组配置项（`packages/backend/src/sources/config-keys.ts`）：多写一个不认识的键，后台会直接拒绝并列出键名，而不是悄悄忽略——静默回退会把菜单和句子片段当文章收进来。

- `json_list`：`url`、`itemsPath`、`titlePaths`、`publishedAtPath`、`urlTemplate`；要 POST 就配 `method`、`headers`、`bodyJson`，数据在页面脚本里就配 `windowVar`。
- `x_search`：`query` + `searchType`。账号按分片读取（精选组的账号半小时一次，只作热度证据的一小时一次），需要 `SOCIALDATA_API_KEY`。
- `mp_account`：`ghid` 或 `nickname`；同一篇公众号文章只收一次，需要 `DAJIALA_KEY`。
- `external`：`POST /api/ingest/items`，Bearer `INGEST_TOKEN`，一次最多 50 条；未知的 `sourceId` 会建成 `external` + `isolated` 的源，等运营在后台确认。

## web_list：选择器怎么写

以中国食品药品网为例，列表页的每条新闻本身就是一个链接：

```json
{
  "url": "https://www.cnpharm.com/yp/xyyf/",
  "parseMode": "html",
  "itemSelector": "a[href^=\"/c/20\"]",
  "publishedAtRegex": "(20\\d{2}-\\d{2}-\\d{2})",
  "allowUrlPrefixes": ["https://www.cnpharm.com/c/"]
}
```

- `itemSelector`：一条新闻一块，不是整个列表；像上面这样直接匹配 `<a>` 也可以。生物谷、药智网、AbCellera 先选中卡片，再用 `linkSelector`、`titleSelector` 往里找。
- `linkSelector` / `titleSelector`：不给时链接取块内第一个 `<a href>`，标题取链接文字。
- `publishedAtSelector`：块内第一个匹配元素的日期。依次读 `datetime`、`content`、`title`、文字；文字里能认出「2026-09-26」「Sep 26, 2026」「3 小时前」「昨天」这类写法。
- `publishedAtRegex`：`publishedAtSelector` 没取到日期时的兜底。它作用在这个条目的整块 HTML 上（含子元素），取**第一个分组**。正则要写捕获组，而且要在整块 HTML 里能唯一命中。
- `publishedAtUtcOffset`：页面时间不带时区时按它读，默认 `+08:00`。纯日期（`2026-09-26`）按源时区的零点读，不是 UTC 零点；只有自带时区的时间才交给 `Date.parse`。
- `allowUrlPrefixes` / `denyUrlPrefixes`：只收这些前缀下的链接（忽略 http/https 差异），挡掉导航、标签页和登录页。
- `parseMode`：`html`（默认）、`markdown`（把列表交给 Jina Reader，适合结构不稳的外文站）、`docusaurus_changelog`、`markdown_changelog`、`intercom_changelog`（更新日志按日期标题切块）。
- `_aihot.initialBackfillLimit`：首次导入最多收几条，默认 30；`_aihot.initialBackfillMonths` 默认 12 个月。本站大多取 8 条：bioRxiv、中国食品药品网 12 条，arXiv、medRxiv、药时代 10 条，慢站（Owl Posting、Cradle）4 条，避免第一次就灌进几百条旧文。
- `detail`：列表页缺日期、标题或摘要时去原文页补。`maxFetches` 是每轮最多读几页（默认 0，即不读）；`publishedAtSelector` / `publishedAtRegex` / `titleSelector` / `titleRegex` / `summarySelector` 是原文页的规则；`publishedAtAuthoritative: true` 表示只认这条规则，规则找不到时也不拿页面上的更新时间顶替。

## 加源之前，先用框架自己的解析器预演

**curl 通，不等于框架能解析。** 本站清单里没有 Pharmaceutical Executive 和 Cell Chemical Biology，就是因为它们的订阅或列表能返回 200，但框架的解析器读不出可用条目（一条都匹配不上，或原文页 403），预演阶段就被筛掉了。

做法：

1. 后台「信源」→ 新建，填 `kind` 和 `config`，点预览。预览调用 `previewSource`：和生产采集同一套解析、同一套日期与正文补全、同一套公开边界，返回匹配条数和前 20 条（标题、链接、时间、摘要），**不写库**。
2. 看三件事：条数是否接近页面上的新闻数；标题是不是新闻标题（不是「阅读全文」「更多」）；时间是否正确（不是抓取时间，也不是页脚时间）。
3. 已有源改选择器，用该源详情页的预览重新跑（`previewStoredSource`），不用等下一轮采集。

仓库里没有通用的「预演 CLI」：`scripts/` 下是 seed、retune、collect、eval-*、smoke 这些脚本，没有 `preview.ts`。生产镜像里可以用 `docker compose exec -T api node scripts/…` 跑这些脚本；要预演一个还没入库的源，用后台预览，或在容器里调用 `previewSource`（`@aihot/backend/admin/sources` 导出）。不要为了预演去改库。

## 写清单、上库、改配置

`industry/sources.json` 的字段：`id`、`name`、`kind`、`config`、`tier`、`owner_entity_id`、`participation_mode`、`interval_minutes`、`tags`、`site_fulltext`、`syndicate_fulltext`。

- `tier`：`T1` 官方一手（官网、机构、期刊与预印本）、`T1_5` 官方账号/准官方创作者、`T2` 媒体与个人；`EXCLUDE_MP` 只进「全部动态」，不参与精选。导入时 `T1` 同时被记为 `first_party`。
- `owner_entity_id`：这家源属于哪家公司。同一家公司的多个渠道在热度里只算一个参与方；`T1_5` 的官方账号要当代表报道，也要填。
- `participation_mode`：`editorial` 正常参与精选；`hot_signal` 只作热度证据；`isolated` 不参与热度也不进精选。
- `site_fulltext` / `syndicate_fulltext`：是否在站内展示全文、是否允许联合发布。默认只展示摘要和原文链接，来源明确允许时才打开。

导入与修改：

- 本地 `node --env-file=.env scripts/seed.ts`，容器 `docker compose exec -T api node scripts/seed.ts`。它只**补新源**：`ON CONFLICT (id) DO NOTHING`，已经入库的行一个字段都不改，后台改过的也不会被覆盖。
- 所以改已有源要去后台改；只改抓取间隔时，改清单后跑 `node --env-file=.env scripts/retune.ts --dry` 看差异，再去掉 `--dry` 写库。retune 只同步 `interval_minutes`，tier、config、开关一概不碰；清单里还没入库的源会列出来，提示你用 seed 新建。

## 抓取间隔怎么分层

按「谁变得快」给初值：

| 类别 | 间隔（分钟） | 本站取值 |
|---|---|---|
| 监管与公司官方 | 120–240 | DeepMind 120、FDA 新闻稿 180；NVIDIA、FDA 药品、Broad、CZI Biohub 240；更新慢的公司博客放宽（晶泰、MSR 360，Cradle 720） |
| 中文媒体 | 60–240 | 药时代 60、中国食品药品网 120、生物谷 180、药智网 240 |
| 期刊与预印本 | 360–480 | Nature 系与 arXiv 360；bioRxiv 180、medRxiv 240 因为更新快 |
| 更新慢的站 | 480–720 | Labiotech、Cradle 720；PharmaTimes、Owl Posting 480 |

这些数字是入库初值。采集开着时，每天 04:20 有一个 `sources.adapt-intervals` 任务按近 7 天的实际产出再调一次：普通 RSS/网页最快 15 分钟、最慢 60 分钟；X 账号和经 Jina 读的列表最慢 120 分钟（Jina 列表最快 60 分钟，按次付费）；只作热度证据的源最慢 180 分钟。所以长期节奏由产出决定，retune 只是把清单里的值同步一次。

## 规则：旧文不刷屏

新源第一次导入只收清单允许的范围：`_aihot.initialBackfillMonths`（默认 12 个月）以内，并且最多 `_aihot.initialBackfillLimit` 条（默认 30）。之后的每一轮只收「信源入库时间往前 48 小时」之后发布的新条目——列表页底部的存档不会被当成今天的新闻，也不会被逐条付费分析。

- 没有发布时间的条目照常收；原文页读到日期后如果早于这个边界，就不入库。
- X 账号按自己的水位线续读，不套用 48 小时规则。
- `publishedAfter` 是另一个固定的时间边界（UTC 时刻），每轮都生效，用来整体截断某个源。
- 首次导入的旧条目按原文时间归档（`backfill`），不进「今天」和日报，也不触发推送。

## 抓不动的时候

后台信源详情页显示最近一次抓取的结果和错误。常见原因：`no items matched (html)` 说明选择器没匹配上（多半是页面改版）；403 或挑战页说明对方拒了；只有 JS 才渲染的列表要么换 Jina 的 `markdown`，要么放弃。失败的条目不会被当成已补齐，下一轮会重试；连续失败会出现在周一发给运营的信源健康报告里。

改完选择器，先跑一次预览再保存——这和「加源之前」一节是同一条规矩。
## 中文站：试过但拿不到的

中文医药资讯大多没有 feed，列表页还常常是 JS 渲染的。下面这些是逐个看过的结论，换选择器之前先对照，别重复试：

- 动脉网 `www.vbdata.cn`：Nuxt 客户端渲染，HTML 里没有文章链接。
- 医药魔方 `pharmcube.com`：`/news`、`/news/list`、`/newsList` 全 404。
- 米内网 `www.menet.com.cn`：列表页只有 tag 链接，文章行要登录才展开。
- 生物通 `www.biomart.cn/news/`：429；`/news/index.htm` 是 404。
- 药渡 `www.yaodu.cn`：请求超时。
- 医麦客、丁香园、药融圈：TLS 失败 / 没有条目 / 空页。
- 中国食品药品网「产业观察」`/yp/cygc/`：能抓，但内容停在 2025 年 9 月，等于没有更新。
- 药研导航 `www.drugfuture.com/news/`：列表页不写日期，日期在网址的 `YYYYMM` 段里，框架的 `publishedAtRegex` 取的是第一个分组、按日期解析，`202607` 这种拿不到，只能进详情页抓，代价是每条一次请求。
- NMPA `www.nmpa.gov.cn`：412；CDE `www.cde.org.cn`：202。都要代理或人工。
- 生物谷首页 `www.bioon.com` 有日期也有文章链接，但和 `news.bioon.com` 那一条重复，只留后者。

现在跑着的四个中文源是：药时代（RSS，质量最高）、中国食品药品网·新药研发、生物谷资讯、药智网新闻。公众号要 `DAJIALA_KEY`（按请求计费），没接。

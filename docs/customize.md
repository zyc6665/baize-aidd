# 改这个站

白泽智药是 AIDD（AI 药物研发）的行业热点站：盯新模型与新方法、工具平台、临床与管线、交易与资本、政策与监管、产业与生态、观点分析这七类消息，里面有模型卡、交易与临床读出三张台账，以及从读出里长出来的靶点页和药物页。

要改它，只有两处要动：`site/` 是这个站自己的身份（站名、文案、每一步的模型、品牌、条款页），`industry/` 是行业知识（分类、主题、信源、别名、提示词、门槛、校准样本）。`apps/` 和 `packages/` 是引擎，换行业不该碰；引擎里确实没有的功能，按 [架构](architecture.md#模块) 的“模块”做，别改共享代码。

这份文档写给之后接手的人：一件事落在哪个文件，哪几个 key 上线后不能动，改门槛为什么必须先校准。

| 想改什么 | 落在哪 |
|---|---|
| 站名、简介、标题、页脚 | `site/site.ts` |
| 出刊时间、导航、限流说明 | `site/site.ts` 的 `EDITION_TIMES`、`NAV`、`ACCESS` |
| 每一步用哪个模型 | `site/models.ts` 与环境变量 |
| 分类、标签、公司名录 | `industry/taxonomy.ts` |
| 主题页（`/topics`） | `industry/topics.json` |
| 信源 | `industry/sources.json`，上线后用后台“信源”页 |
| 靶点、药物的同义写法 | `industry/aliases.json` |
| 预筛、评分、写作、归组、结构抽取 | `industry/prompts/` |
| 入选门槛 | `industry/selection.ts` |
| 门槛校准用的样本 | `industry/gold.jsonl` |
| Logo、图标、报头字、二维码 | `site/brand/` |
| 条款、隐私 | `site/pages/` |
| 站点根目录的固定文件 | `site/public/` |
| 更新日志 | `site/changelog.json` |

## 1. 站名和文案：`site/site.ts`

每个导出项旁边都有注释（用在哪里、能不能留空、默认值什么意思），从上往下按注释改。跨文件或上线后要注意的只有这几条：

- **站点地址不在 `site.ts` 里**：部署时用环境变量 `SITE_URL` 设置；`SITE.defaultUrl`（现在是 `https://cpumodel.online`）只是没设 `SITE_URL` 时的兜底。
- **一起改的名字**：改 `SITE.name` 时顺手改 `SITE.organization.name`（结构化数据里的机构名）；`SITE.crawlerName`（现在是 `BaizeBot/1.0`）是抓取标识，别冒用别人的站名。
- **版权与页脚**：`ABOUT.copyright`（版权与下架说明）、`SITE.footerNote`、`SITE.contactEmail` 按站主的意见定；现有文案里提到框架名的地方按 `AGENTS.md` 的约定一并处理，本站不冠框架的名字和 Logo。
- **写死了行业说法的地方**：`SEO_TITLES` 里写的是“AI 药物研发每日要闻”“一周 AIDD 要闻回顾”“月度 AIDD 盘点”，`FEED_COPY.allLeavesOut` 写的是“与 AI 药物研发和生物医药产业都无关的通用科技新闻”。改站的主题时这两处要跟着改，否则标题和订阅说明会跟内容对不上。
- **中英文之间的空格**：站名和主题里都是英文缩写（`AIDD`），`withSubject()`、`subjectAfter()` 负责拼接标题时补空格并处理英文词前后的空白，改标题模板时别绕过它们。
- **上线或有人接入后不要再改的标识**：`SITE.mcpPrefix`（现在是 `baize`，MCP 工具名是 `baize_get_latest`、`baize_search` 这类，改了等于换一套工具）、`PUBLIC_CATEGORIES`（公开接口与分类 RSS 的类别合并和改名，参数里有 key）、`ABOUT.termsAnchor`（外部可能引用过的锚点）。`SITE.interfaceVersion` 只升不降，改公开字段或含义时升主版本。
- **出刊时间写整点或半点**：`EDITION_TIMES`（北京时间，现在是日报 08:00、周报 10:00、月报 10:30）由每半小时一次的排程检查，日报窗口、缺期告警和各处时间文案都读它。
- **导航隐藏的范围有限**：`NAV.hidden` 只开放 `"/hot"` 和 `"/topics"`，页面本身照样能打开；隐藏 `/hot` 时首页的热点条一起去掉。
- **限流说明与实际一致**：前面的反向代理真的按 IP 限流了，再填 `ACCESS.ratePerMinute`。

## 2. 分类、标签、主题、别名

`industry/taxonomy.ts` 定义七类（`CATEGORIES`：`models` 模型与方法、`tools` 工具与平台、`clinical` 临床与管线、`deals` 交易与资本、`policy` 政策与监管、`industry` 产业与生态、`opinion` 观点与分析）、报头计数（`RELEASE`：`models` 上的“模型发布 / 项新方法”）、英文缩写免核对词（`PLAIN_TERMS`，如 `fda`、`ind`、`adc`、`glp-1`，这些词出现在标题里不算“原文没提”）、内容类型（`ITEM_TYPES`）、标签词表与近义词、公司名录与防张冠李戴词典。

- **`CATEGORIES` 的 key 上线后不改**：它进网址和订阅地址（`/all?category=clinical`、`/feed/category/clinical.xml`）。要让某一类在公开接口和 RSS 里并进另一类（网页上仍分开），配 `site/site.ts` 的 `PUBLIC_CATEGORIES`。
- **改分类或标签必须同步三份提示词**：`industry/prompts/structure.md`（归类原则、标签规则、三张结构化卡的判定）、`content-understanding.md`（内容类型枚举）、`selection-score.md`（各内容类型的五维权重表）。只改 `taxonomy.ts`，模型会按旧规则往新类别里塞东西。
- **不需要防张冠李戴时可以清空**：`IDENTITY_LEXICON`、`PUBLISHER_DOMAINS`、`IDENTITY_CONTEXT_ALIASES` 保证标题摘要里提到的公司在原文里出现过；不想要这项检查就设成空数组。
- **`industry/topics.json`**（主题页 `/topics`）分 `company`（公司与平台）、`field`（技术方向）、`genre`（内容形态）三组，站点启动时读取，改完重新构建生效。`slug` 上线后不要改（进网址）。`company` 用 `entityId` 收以这家公司为主体的报道，可写 `aliases` 让搜索也能找到；`field` 和 `genre` 用 `tags`。
- **`industry/aliases.json`**（靶点与药物的同义写法，现在 17 组靶点、16 组药物）：`name` 是页面上显示的标准名，`aliases` 是原文里的写法（大小写、连字符、括号、商品名与通用名）。匹配前按字母数字归一，`KRAS G12C`、`KRAS(G12C)`、`KRAS G12C 突变` 是同一页；没列进来的名字靠“字母互相包含”自动归并，但 `KRAS G12D` 会被并进 `KRAS`——要单独成页就得写进这张表。加条目只影响实体页，不改动已入库的分析结果。

## 3. 信源：`industry/sources.json`

现在是 38 个信源：34 个 RSS、4 个网页列表；排在最前的是 bioRxiv 全部、Nature Biotechnology、Nature Machine Intelligence、Nature Reviews Drug Discovery 这类一手来源。这份文件只在启动时导入：文件里有的、库里没有的补上，已存在的不覆盖，从文件里删掉的也不会从库里删（不要的在后台暂停）。上线后日常维护用后台“信源”页：新建、试抓、调频率、暂停、看失败原因。

| 字段 | 含义 |
|---|---|
| `kind` | `rss`、`web_list`（网页列表，配选择器）、`json_list`（JSON 接口）、`x_search`（X 账号，需要 SocialData）、`mp_account`（公众号，需要极致了）、`external`（外部推送） |
| `config` | 每种信源自己的配置，见 [信源](sources.md) |
| `tier` | `T1` 官方一手、`T1_5` 官方账号与准官方、`T2` 媒体与个人、`EXCLUDE_MP` 与未列出的分级不参与精选评分（只进“全部动态”）。分级决定入选门槛 |
| `owner_entity_id` | 可选，属于哪家公司（`ENTITIES` 的 id）。同一家公司的几个信源在热度里只算一个参与方 |
| `participation_mode` | `editorial` 进精选和全部动态；`hot_signal` 只作热度证据；`isolated` 不进任何公开页面 |
| `site_fulltext` | 站内能不能展示全文，**默认关**，只展示摘要和原文链接 |
| `syndicate_fulltext` | 全文 RSS 能不能带正文，**默认关**，只在站内也展示全文时生效 |

AIDD 的一手信息很多在期刊、公司管线页和 FDA/EMA/NMPA 公告上，公众号与 X 用来补 BD 与会议消息；公众号信源要极致了（Dajiala）的 key，按请求计费并有预算熔断。哪种消息值得加信源，问站主本人，不要替他决定。

## 4. 精选标准：`industry/prompts/`

最值得花时间的一步，你对这个行业的判断就写在这里。

| 文件 | 作用 |
|---|---|
| `prefilter.md` | 预筛：这条资料是不是 AI 药物研发或生物医药产业的事。宽召回，只拦明显无关的 |
| `selection-score.md` | **评分标准**：0–100 分，含内容类型、五个维度、各类型权重、必须正常评价的价值、必须压住的噪声 |
| `content-understanding.md` | 入选和接近入选内容的写法：中文标题、答案先行的摘要、推荐理由、内容类型 |
| `rules-domain.md` | 术语的翻译与保留规则（如 ADC 译作抗体偶联药物、IND 保留英文、AlphaFold3 不译） |
| `mend-wording.md` | 改用词：标题摘要用了 `industry/wording.ts` 里列出的词时，只改这些词 |
| `summarize-*.md` | 其他内容的标题摘要写法 |
| `structure.md` | 分类、标签、主体公司，判断是具体新闻还是综合稿，抽出事实，并抽 `deal` / `readout` / `modelCard` 三张卡 |
| `group-*.md` | 事件归组：同一次发生、同一事件的后续，还是两件事；报道有没有新信息 |
| `story-digest.md` | 事件页综述（改之前用 [综述评测](story-digest-evaluation.md) 并排比较） |
| `report-period*.md` | 周报月报的总述与栏目导读（日报按规则编排，不用提示词） |
| `translate-*.md` | 全文翻译 |

三张结构卡不是随便加的字段：它们直接长出 `/deals`、`/readouts`、`/model-cards`、`/targets`、`/drugs` 和周报月报的“台账”段。改卡的字段名或口径，要同时改 `packages/contracts/src/site.ts` 的类型、`publication/structured.ts` 与 `entities.ts` 的读法、`reports/ledger.ts` 的统计，细节见 [架构](architecture.md#台账交易临床读出模型卡) 的“台账”一节。提示词里那句“数字必须是原文里能原样查到的写法，不估算、不换算、不补全”是这三张表的可信度来源，不要放宽。

改评分标准时**保留结构**（内容类型、五维加权、噪声压制、安全边界），只换例子：AlphaFold3 与 Boltz-2 的开源权重和基准、KRAS G12C 抑制剂的 ORR 与 PFS 读出、license-out 交易的首付与总额、FDA 批准新适应症，这些该正常评价；融资 PR 稿、会议报名页、纯综述营销文、股价点评要压住。

`industry/wording.ts` 的 `READER_WORDING` 现在是空的，要拦“炸裂”“王炸”这类词时按正则加条目；写了之后模型步骤“改用词”（`WORDING_MODEL`）才会跑，改完数字有变、标题摘要变空或模型拒绝，就保留原文字。

提示词里用 `{{siteName}}` 指代站名，`{{> 文件名}}` 引用另一份提示词，改提示词不用改代码。

## 5. 门槛与校准：`industry/selection.ts`

两次评分之和 ≥ 2 × 门槛才够分（够分的还要过归组去重，见 [精选与校准](selection.md)）。现在的值：

- `thresholds`：`T1` 36、`T1_5` 38、`T2` 40。官方一手的最低，媒体最高。
- `classes`：厂商技术博客 39、财报与投资者关系 44、评测榜单 48，只抬不降。
- `understandFloor` 35（没入选但分数高于它的，也按入选的写法做内容理解），`browseFloor` 25（“全部动态”里还看得见的最低分）。

**媒体门槛必须高于官方**：把 `T2` 放到 36 能多收一些稿子，但媒体转述会压过官方原文，权威排序就毁了。这条比多收几条重要。

**不要凭感觉改数字**，这个站的评分模型分布是压缩的（真事大多 40–60 分，噪声 12–30 分），几分之差就能改变一批结果。校准顺序：

1. 标注样本：从本站信源挑一批资料，自己判“该选 / 不该选”，存进 `industry/gold.jsonl`（现有 28 条，格式见 `industry/gold.example.jsonl` 和 [精选与校准](selection.md)）。加样本前先跑 `npm run check:gold`，它只校验字段和决策值，不调模型、不连数据库。
2. 跑评测：`node --env-file=.env scripts/eval-selection.ts --gold industry/gold.jsonl`，看查准率、查全率、判错的条目；报告写在 `.data/eval/selection-*.json`，同时导入后台 SelectBench（`--no-import` 可跳过）。
3. 逐条看错的：在后台 SelectBench 里读被判错的原文，判断是该改评分提示词还是改门槛，改完再跑一遍。有回执，重跑同一条样本不重复花钱。
4. 门槛扫描的区间来自 `site/site.ts` 的 `DEPLOYMENT.selectionGold`：现在是 `null`，脚本就用自己默认的 40–90，看不到现在的 36 和 38。要在低分区比较，把 `selectionGold` 写成 `{ file: "industry/gold.jsonl", sample: 200, split: "all", sweep: [30, 46] }` 再跑。

改 `selection.ts` 不会让测试失败（门槛由代码读），但等于换了站的取舍，改完必须重跑 gold 样本，并在更新日志里写清楚。

## 6. 品牌：`site/brand/`

- `logo.svg`、`icon.png`（512）、`icon-192.png`、`apple-icon.png`（180）、`favicon.ico`：站点图标。
- `Logo.tsx`：网页左上角的标志，默认用站名文字排出来；有正式 Logo 时把 `Wordmark` 换成 SVG，参数保持不变。
- `wordmark.svg`、`wordmark-dark.svg`（可选）：分享图和海报上的字标。
- 分享图字体（可选，`assets/og-fonts/`）：默认用 Noto Sans SC 子集；信源里常出现繁体、日文汉字或带变音符的拉丁字母时，放 `<名字>-400.ttf`、`<名字>-700.ttf` 补字，缺的字按文件名顺序回退，换字体要重启服务。
- `nameplates/`：日报周报月报页顶部的报头字。改站名或行业词以后重新生成：
  ```bash
  npm pack @fontsource/noto-sans-sc@5.3.0 && tar xzf fontsource-noto-sans-sc-5.3.0.tgz
  node scripts/nameplates.ts package
  ```
- 关于页二维码：先在 `site.ts` 的 `ABOUT.maker` 写好作者块和 `wechat`、`feishu` 卡片，再在后台“设置 → 关于页二维码”上传，或把图片放进 `site/brand/contact/`，文件名以 `qr-wechat`、`qr-feishu` 开头（png/jpg/webp）。缺一样，那张二维码就不显示。

站名、图标和 Logo 全部用本站自己的，别沿用框架自带的（见 `AGENTS.md`）。

## 7. 页面文案与站点根目录文件

- `site/pages/terms.md`、`privacy.md`：使用规则和隐私说明，现在是模板，上线前按实际情况改写并请站主本人确认。
- `site/public/`：站点根目录的固定文件，替换占位符后发布：`robots.txt`、`manifest.webmanifest`（装到手机桌面的名字和图标）、`openapi-v1.json`（公开 API 说明），以及可选的 `.well-known/security.txt`。只发布这几个，放进去的其他文件不会出现在网站上。可用的占位符：`{{siteName}}`、`{{siteUrl}}`、`{{description}}`、`{{tagline}}`、`{{locale}}`、`{{dailyTime}}`、`{{weeklyTime}}`、`{{monthlyTime}}`、`{{version}}`、`{{categoryList}}`；JSON 文件里 `enum` 或 `examples` 中的 `"{{categories}}"` 会换成公开分类的 key 列表。
- `site/changelog.json`：更新日志，首条是“网站上线”（2026-11-10 08:00）。新条目写在最前面并改 `latestVersion`；`kind` 取“更新”“优化”“公告”“下线”之一，要读者一定看到的加 `"urgent": true`。

## 8. 模型和部署

- `.env` 的 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL` 是所有步骤的默认模型，任何 OpenAI 兼容接口都行。`site/models.ts` 列出具名预设（现在有 glm-5.3-flash、deepseek-flash、qwen3-vl-flash 等）和每一步默认用哪个；单步可在 `.env` 用 `PREFILTER_MODEL`、`SCORE_MODEL`、`STRUCTURE_MODEL`、`GROUP_MODEL` 这类变量改选。
- 用推理模型时留出额度：默认模型设 `LLM_REASONING_TOKENS`，具名模型在 `site/models.ts` 写 `reasoningTokens`。不留的话推理会吃掉整步的输出额度，结果为空。
- 评分那一步可以用 `scoreCall: { temperature, maxTokens, timeoutMs }` 单独配（`glm-5.3-flash-selection` 就是这样一个预设）。备用模型用 `fallbackFor` 按能力名指定它接替谁，启用前先用本站样本评测这组组合。
- 部署见 [部署](deploy.md)。

## 改完以后检查

```bash
npm run typecheck
DATABASE_URL=postgres://…/baize_test npm test     # 库名必须以 _test 或 _ci 结尾，账号要能建库
npm run build -w @aihot/web && npm run test:web
node scripts/smoke.ts --base http://localhost:3000   # 站点跑起来以后
```

改提示词或门槛不会让测试失败（测试按每一步实际渲染的提示词认请求，门槛从 `selection.ts` 读）。但 `tests/` 里有些用例写死了本站的分类 key、标签和公司名，改了 `industry/taxonomy.ts` 之后这些用例会失败——把例子换成新的对应项，测的规则本身不用改。

最后人工看一遍：首页、`/all`、`/deals`、`/readouts`、`/model-cards`、`/targets`、`/drugs`、日报、主题页、关于页，再去后台“信源”页确认都抓成功、“运行”页没有卡住的任务。

# 维护这个站的规矩

这个仓库不是开源项目，是一个站。下面几条是为了让改动能安全落地，不是为了走流程。

## 改动落在哪

- **站点内容**（分类、标签、主题、信源、门槛、提示词、文案、品牌）：只改 `industry/` 和 `site/`。
- **引擎**（`packages/`、`apps/`、`database/`）：能不改就不改。必须改的时候，先想清楚三个月后还记不记得为什么改。
- 已经上线的东西不要动：分类 key（进网址 `/all?category=…`）、`SITE.mcpPrefix`、主题 slug、`PUBLIC_CATEGORIES`。改了等于断外链。

## 改之前

改分类、标签或 `ITEM_TYPES` 要同步改三个提示词：`industry/prompts/structure.md`、`content-understanding.md`、`selection-score.md`，否则模型会往不存在的分类里写。

改门槛、换模型、改评分提示词，都要先跑校准：

```bash
docker cp .data/gold.jsonl aihot-api-1:/tmp/gold.jsonl
docker compose exec -T -u root api node scripts/eval-selection.ts --gold /tmp/gold.jsonl --split all --no-import
```

看 precision / recall，再看分 tier 的 sweep。凭感觉调数字不算改完。

## 改之后

三道检查，缺一道都别上线：

```bash
npm run typecheck
npm test                      # 需要 DATABASE_URL，库名以 _test 或 _ci 结尾
npm run build -w @aihot/web && npm run test:web
node scripts/smoke.ts --base http://localhost:3000
```

数据库迁移（`database/migrations/`）：一个文件一条语句，加进去就不要再改，改了就跑 `node scripts/check-migrations.ts`。

## 提交信息

一句话说清「改了什么、为什么」，不要写「update」「fix」。涉及门槛、提示词、信源的改动，把当时的校准结果或样本一起写进提交信息——下次换模型时唯一能对照的就是它。

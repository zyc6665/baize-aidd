# 部署

本站是「白泽智药」：AIDD（AI 药物研发）行业资讯站。Node.js 24 直接运行 TypeScript，数据在 PostgreSQL，推荐用 Docker Compose 部署：三个长期进程（api、worker、web）加一个数据库。下面的命令都在仓库根目录执行。

## 本机跑起来

```bash
npm ci
node scripts/init-env.ts --llm-key <模型 API Key>
docker compose up -d --build
```

`init-env.ts` 从 `.env.example` 生成 `.env`（权限 0600），填好 `ADMIN_PASSWORD`、`SESSION_SECRET`、`IMG_PROXY_SIGN_SECRET`、`POSTGRES_PASSWORD` 和刚给的 key，并把管理员密码打印一次；`.env` 已存在时它会拒绝覆盖。不想用脚本，就把 `.env.example` 复制成 `.env` 自己填：后台密码至少 12 位，两个签名密钥用 `openssl rand -hex 32` 生成。

Compose 起五个服务：`db`（PostgreSQL 17）、`setup`（跑迁移和种子信源后退出）、`api`、`worker`、`web`。后台在 `/admin`。数据库、模型密钥和上传文件只在后端，网页只通过 HTTP 读 api。

起来之后做一次健康检查：

```bash
node scripts/smoke.ts --base http://127.0.0.1:3000
```

它依次打开首页、全部动态、热点、日报与归档、主题、星标、Agent、关于、更新日志、反馈、条款、隐私、更多和后台登录页，再检查 `/api/health`、`/api/v1/items`、`/api/v1/hot-topics`、`/api/v1/selected/snapshot`、`/feed.xml`、`/feed/all.xml`、`/llms.txt`、`/robots.txt`、`/sitemap.xml`、`/manifest.webmanifest`、`/openapi-v1.json`、`/og/site.png`、`/icon.png`、`/favicon.ico`，最后用 MCP 握手确认返回的服务名是 `baize`。

地址写 `127.0.0.1`，不要写容器名 `web`：MCP 的 Host 校验只接受 `SITE_URL` 的主机名、`localhost`、`127.0.0.1`、`[::1]` 和 `MCP_ALLOWED_HOSTS` 里列出的名字，用 `web` 会拿到 421。确实要在容器网络里测，就把 `web` 加进 `MCP_ALLOWED_HOSTS`，CI 的 docker job 就是这么做的。

## .env 关键项

| 变量 | 说明 |
|---|---|
| `LLM_BASE_URL` | OpenAI 兼容接口的地址，例如 `https://api.deepseek.com/v1` |
| `LLM_API_KEY` | 模型服务的密钥 |
| `LLM_MODEL` | 默认模型。每一步默认都用它，可以在 `site/models.ts` 或后台「模型与评测」里逐步改选 |
| `LLM_EXTRA_JSON` | 额外请求参数（JSON），例如关掉思考的 `{"thinking":{"type":"disabled"}}` |
| `LLM_REASONING_TOKENS` | 给推理过程额外留的输出额度。用思考模型却不留额度，输出会在推理中途被截断（`finish_reason=length`），调用报 `unusable output`，这条资料反复失败也进不了评分 |
| `SITE_URL` | 读者访问的地址。RSS、分享链接、站点地图、Agent 和 MCP 说明里的绝对地址都用它 |
| `COLLECT_ENABLED` | 采集总开关，只有小写 `true` 才算打开 |
| `MODEL_CALLS_ENABLED` | 模型调用总开关，同上；排查问题时先关它 |
| `ADMIN_PASSWORD` | 后台登录密码，至少 12 位 |

容器里的 `127.0.0.1` 指容器自己。模型网关跑在宿主机上时，`LLM_BASE_URL` 要写 `http://host.docker.internal:3425/v1`（端口换成你的），写 `127.0.0.1` 会连到容器内部的空端口。

## 上线前自查

```bash
npm run check:deploy
```

它跑 `scripts/check-deploy.ts`，不连数据库、不调模型、不访问网络，逐条检查：

- `SITE_URL` 是 `https://` 且不是 localhost（阻塞项）；
- `SITE.icp`：`site/site.ts` 里填了备案号才通过（阻塞项）；
- `SITE.psb`：公安备案号，没有就保持 `null`；
- `SITE.contactEmail`：联系邮箱，现在是 `zyc.cpu@gmail.com`；
- `SITE.siteVerification`：站长平台的验证码，不提交收录可以空着；
- 备份对象存储四项：`DB_BACKUP_STORE_SECRET_ID`、`DB_BACKUP_STORE_SECRET_KEY`、`DB_BACKUP_STORE_BUCKET`、`DB_BACKUP_STORE_REGION`；
- `DEPLOYMENT.requiredSecrets`：API 启动时要额外检查的密钥清单，当前为空，启动只查会话、图片签名和管理员登录。

输出里 ✓ 是通过，✗ 是阻塞项，· 是建议补的。有阻塞项时退出码为 1，最后一行写「还有 N 项拦着不能公开上线；另有 M 项建议补上」。

本站现在的状态：`site/site.ts` 的 `defaultUrl` 已是 `https://cpumodel.online`，但 `.env` 里的 `SITE_URL` 还是本机地址时，`SITE_URL` 那项也不会过——内测阶段这是预期的；把 `SITE_URL` 改成 `https://cpumodel.online` 后这一项转绿。ICP 备案还在办，`SITE.icp` 是 `null`，所以无论怎么设 `SITE_URL`，ICP 那项都必然标红。先内测（内网地址或临时端口），备案下来把备案号填进 `SITE.icp` 再跑一次。国内服务器的 80/443 也要等备案下来才能对公网开放。

## 备份

`packages/backend/src/operations/backup.ts` 在对象存储配好后每天 04:10 跑一次：`pg_dump --format=custom --compress=6` 转储数据库，`pg_restore --list` 校验转储能读；有上传目录时再用 `tar -czf` 打包一份。校验通过才上传，文件名带时间戳（如 `20261111T0410`），本地保留最近 3 份。

2026-11-11 在本机实测：镜像里的 `pg_dump` 和 `pg_restore` 都是 17.11，与服务端 PostgreSQL 17 匹配；转储 7.4 MB；恢复到空库一次通过，行数与转储时刻一致。

没配对象存储时，转储和打包照样在本地完成，但最后报 `backup made locally but not uploaded: object store credentials are not configured`，产物留在容器的 `/data/backups`。每天 04:10 的定时任务只在四项配齐后才注册，所以没配时不会有自动转储；能看到本地文件，说明有人手动调过 `runBackup`。

## 备份落点

四项一起配才生效，缺一项就当没配：

| 变量 | 说明 |
|---|---|
| `DB_BACKUP_STORE_SECRET_ID` | 对象存储的 SecretId |
| `DB_BACKUP_STORE_SECRET_KEY` | 对象存储的 SecretKey |
| `DB_BACKUP_STORE_BUCKET` | 桶名 |
| `DB_BACKUP_STORE_REGION` | 地域 |
| `DB_BACKUP_STORE_DOMAIN` | 可选，自定义访问域名；不填就拼 `<bucket>.cos.<region>.myqcloud.com` |

上传走 S3 兼容接口、AWS Signature V4，腾讯 COS 之外的兼容存储也能用。按日期分前缀：每月 1 日进 `monthly/`，周日进 `weekly/`，其余进 `daily/`。配好后再跑一次 `npm run check:deploy`，这一项会转绿。

## 配域名和 HTTPS

域名 `cpumodel.online` 已经买了：把 A/AAAA 记录指到服务器，开放 80 和 443，然后在 `.env` 里写：

```bash
SITE_DOMAIN=cpumodel.online
SITE_URL=https://cpumodel.online
```

用 `docker compose --profile https up -d --build` 起 `caddy`。`deploy/Caddyfile` 会为 `SITE_DOMAIN` 申请并续期证书，反代到 `web:3000`，顺带补上 HSTS、`X-Frame-Options`、`X-Content-Type-Options` 等响应头。证书要能签发，域名得先解析到这台机器；国内主机还要等 ICP 备案。

## 更新

拉新代码后重建，让 `setup` 把迁移跑完：

```bash
git pull
docker compose up -d --build
```

`setup` 每次启动执行 `scripts/migrate.ts` 和 `scripts/seed.ts`，`api` 和 `worker` 等它成功后才启动。worker 停止时会留给正在跑的采集和模型调用一段收尾时间（约 8 分半），所以 `docker compose stop` 不会立刻返回。迁移里有会删掉已有数据的改动，会写在这一节。

## 不用 Docker

需要 Node.js 24（`package.json` 要求 `>=24.22.1`）和一个 PostgreSQL 16 或 17。建好库后：

```bash
npm ci
node scripts/init-env.ts --llm-key <key>
# .env 里补 DATABASE_URL，例如 postgres://user:<密码>@127.0.0.1:5432/baize
npm run db:migrate
node --env-file-if-exists=.env scripts/seed.ts
npm run build -w @aihot/web
node --env-file-if-exists=.env apps/api/src/main.ts     # API，3001
node --env-file-if-exists=.env apps/worker/src/main.ts  # 采集、模型处理、定时任务
node --env-file-if-exists=.env apps/web/server.ts       # 网页，3000，读者访问这个
```

三个进程都要带 `--env-file-if-exists=.env`，它们不会自己读 `.env`；`npm start` 不带这个参数，会把密钥和数据库地址都漏掉。网页进程用 `API_BASE_URL` 找 api，默认 `http://127.0.0.1:3001`，端口不同就显式写上。不跑 worker 就没有采集和模型处理，只能看库里已有的内容。

## CI

`.github/workflows/check.yml` 在 push 和 PR 上跑两个 job。

`check`：起 `postgres:17-alpine` service，`npm ci` 后先跑迁移的在线安全检查（不能改历史迁移、不能整表重写或建阻塞式索引），再装与 PostgreSQL 17 匹配的客户端、`npm run typecheck`、`npm run check:gold`、构建网页、装 Playwright 的 chromium 与 webkit、`npm run test:web`、`npm test`，最后以 `COLLECT_ENABLED=false`、`MODEL_CALLS_ENABLED=false` 起 api 和 web，跑 `smoke.ts` 和 `mcp-check.ts`。测试和 CI 都不碰外部服务，模型调用走本地假服务。

`docker`：用假 key 生成 `.env`，关掉采集与模型，`docker compose up -d --build`，再在容器网络里跑一次 smoke（那里 `MCP_ALLOWED_HOSTS=web`），并核对种子信源的行数。

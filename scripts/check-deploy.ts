// 上线前自查：把「只能由站主人定」的几件事逐条点一遍，缺什么就直说缺什么。
// 不连数据库、不调模型、不访问网络，所以本地和 CI 都能跑；但它对着正式域名才有意义。
// 用法：node scripts/check-deploy.ts
import { config } from "@aihot/backend/config";
import { DEPLOYMENT, SITE } from "@aihot/site";

interface Item {
  /** 缺了它站点还能跑，但会在公开出口上露出来（链接、抓取、联系渠道）。 */
  blocking: boolean;
  label: string;
  ok: boolean;
  hint: string;
}

const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(config.siteUrl);
const https = config.siteUrl.startsWith("https://");
const backupVars = ["DB_BACKUP_STORE_SECRET_ID", "DB_BACKUP_STORE_SECRET_KEY", "DB_BACKUP_STORE_BUCKET", "DB_BACKUP_STORE_REGION"];
const backupMissing = backupVars.filter((name) => !process.env[name]?.trim());

const items: Item[] = [
  {
    blocking: true,
    label: `SITE_URL 指向正式地址（当前 ${config.siteUrl}）`,
    ok: !local && https,
    hint: "RSS、分享链接、站点地图、Agent 说明里的绝对地址都用它；必须是带域名和 HTTPS 的地址，不能是 localhost。",
  },
  {
    blocking: true,
    label: "ICP 备案号填在 site/site.ts 的 SITE.icp",
    ok: typeof SITE.icp === "string" && SITE.icp.trim().length > 0,
    hint: "在中国大陆的服务器上对外提供网站服务，没有备案号会被拦；真没办或不在大陆，就在文件里写清为什么不填。",
  },
  {
    blocking: false,
    label: "公安备案号填在 SITE.psb（没有就 null）",
    ok: SITE.psb === null || SITE.psb.trim().length > 0,
    hint: "备案过的站一般也要挂公安备案号；不适用就保持 null。",
  },
  {
    blocking: false,
    label: "联系邮箱填在 SITE.contactEmail",
    ok: typeof SITE.contactEmail === "string" && SITE.contactEmail.includes("@"),
    hint: "隐私说明、来源方下架请求、security.txt 都靠它；空着读者找不到人。",
  },
  {
    blocking: false,
    label: "站长平台验证码填在 SITE.siteVerification（可选）",
    ok: Object.keys(SITE.siteVerification).length > 0,
    hint: "百度、必应、360 等给了 HTML 标签验证码就填在这里；不提交收录可以空着。",
  },
  {
    blocking: false,
    label: "备份对象存储四项都填了",
    ok: backupMissing.length === 0,
    hint: backupMissing.length === 0 ? "" : `缺 ${backupMissing.join("、")}；不填的话每天 04:10 只在本地产一份 .dump，机器没了就一起没了。`,
  },
  {
    blocking: false,
    label: "生产必填凭据清单（DEPLOYMENT.requiredSecrets）",
    ok: true,
    hint: DEPLOYMENT.requiredSecrets.length === 0 ? "当前为空：API 启动时只检查会话、图片签名和管理员登录。" : `API 启动时会额外检查：${DEPLOYMENT.requiredSecrets.join("、")}。`,
  },
];

const missing = items.filter((item) => !item.ok);
for (const item of items) {
  console.log(`${item.ok ? "✓" : item.blocking ? "✗" : "·"} ${item.label}${item.ok || !item.hint ? "" : `\n    ${item.hint}`}`);
}

const blocking = missing.filter((item) => item.blocking);
if (blocking.length > 0) {
  console.error(`\n还有 ${blocking.length} 项拦着不能公开上线；另有 ${missing.length - blocking.length} 项建议补上。`);
  process.exit(1);
}
console.log(missing.length === 0 ? "\n都齐了，可以对外。" : `\n拦路的都齐了；还有 ${missing.length} 项建议补上（不挡上线）。`);

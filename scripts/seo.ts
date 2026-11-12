// Search-engine intake, set up in one command.
//
//   node scripts/seo.ts              generate an IndexNow key if .env has none, print what to do next
//   node scripts/seo.ts --enable     also flip INDEXNOW_SUBMIT_ENABLED=true
//
// IndexNow only means something once SITE_URL is the real site and the site answers on it: the key file has to
// be reachable at <SITE_URL>/<key>.txt, which is why this refuses while SITE_URL is localhost.
// Baidu has no key file — it wants the site verified in 百度搜索资源平台 and a push token; both are manual and
// printed at the end instead of done for you.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const FILE = ".env";
if (!existsSync(FILE)) {
  console.error("没有找到 .env：先运行 node scripts/init-env.ts，或者从 .env.example 复制一份。");
  process.exit(1);
}
const lines = readFileSync(FILE, "utf8").split(/\r?\n/);
const value = (name: string) => lines.find((l) => l.startsWith(`${name}=`))?.slice(name.length + 1).trim() ?? "";
const set = (name: string, next: string) => {
  const at = lines.findIndex((l) => l.startsWith(`${name}=`));
  if (at >= 0) lines[at] = `${name}=${next}`;
  else lines.push(`${name}=${next}`);
};

const siteUrl = value("SITE_URL");
if (!siteUrl) {
  console.error("SITE_URL 是空的：站点地址决定了 IndexNow 提交什么，先填上。");
  process.exit(1);
}
const live = /^https:\/\/[^/]+/.test(siteUrl) && !/localhost|127\.0\.0\.1/.test(siteUrl);

let key = value("INDEXNOW_KEY");
if (!/^[0-9a-f]{32}$/.test(key)) {
  key = randomBytes(16).toString("hex");
  set("INDEXNOW_KEY", key);
  console.log(`已生成 IndexNow key：${key}`);
} else {
  console.log(`沿用已有的 IndexNow key：${key}`);
}

const enable = process.argv.includes("--enable");
if (enable) {
  if (!live) {
    console.error(`SITE_URL 还是 ${siteUrl}，是本站对外地址之前不开提交：key 文件挂在这个域名下才对得上。`);
    writeFileSync(FILE, lines.join("\n"));
    process.exit(1);
  }
  set("INDEXNOW_SUBMIT_ENABLED", "true");
  console.log("已打开 INDEXNOW_SUBMIT_ENABLED：worker 每小时把新出现的页面提交一次。");
}
writeFileSync(FILE, lines.join("\n"));

console.log("");
console.log("IndexNow：");
console.log(`  key 文件应当能打开：${siteUrl}/${key}.txt（服务会自动提供，内容和 key 一样）`);
console.log(`  页面清单：${siteUrl}/sitemaps/pages.xml`);
console.log(`  确认 key 文件能打开后再开提交：node scripts/seo.ts --enable，然后 docker compose up -d worker`);
console.log("");
console.log("百度：");
console.log("  1. 在百度搜索资源平台添加站点并验证：验证码填进 site/site.ts 的 SITE.siteVerification，");
console.log('     形如 { "baidu-site-verification": "codeva-…" }，验证通过后也留着，平台会定期复查。');
console.log("  2. 普通收录 · API 提交：把推送地址末尾那一段写进 .env 的 BAIDU_PUSH_TOKEN，");
console.log("     再把 BAIDU_PUSH_ENABLED 改成 true（每天按配额推一次新页面）。");
console.log("  3. 百度不认 IndexNow，这两个开关互不影响。");

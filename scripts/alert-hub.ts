// 本机告警接收端：把 WEBHOOK_HUB_URL 指过来，就能看清每条告警长什么样，再决定要不要接进群里。
//
//   node scripts/alert-hub.ts            # 监听 4589，收到什么打什么
//   WEBHOOK_HUB_URL=http://127.0.0.1:4589 WEBHOOK_HUB_KEY=任意字符串
//
// 容器里跑时，容器访问宿主机要用 http://host.docker.internal:4589（Docker Desktop 自带解析）。
import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 4589);
const expected = process.env.WEBHOOK_HUB_KEY ?? null;

const server = createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/tell") {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("POST /tell only");
    return;
  }
  if (expected && req.headers.authorization !== `Bearer ${expected}`) {
    res.writeHead(401, { "content-type": "text/plain; charset=utf-8" }).end("bad key");
    return;
  }
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    let body: { key?: string; text?: string } = {};
    try {
      body = JSON.parse(raw) as { key?: string; text?: string };
    } catch {
      console.log(`${new Date().toISOString()} 不是 JSON：${raw.slice(0, 200)}`);
    }
    if (body.key || body.text) {
      console.log(`--- ${new Date().toISOString()} key=${body.key ?? "-"}`);
      console.log(body.text ?? "(no text)");
    }
    res.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}');
  });
});

server.listen(port, () => {
  console.log(`告警接收端在 http://127.0.0.1:${port}/tell 上等消息；Ctrl+C 结束。`);
});

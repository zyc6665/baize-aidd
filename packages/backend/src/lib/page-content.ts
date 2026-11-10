// HTTP 200 can be a publisher's error page, including behind a paid browser renderer.
import { parseHTML } from "linkedom";
import { collapseWhitespace, stripTags } from "./text.ts";

export class UnavailablePageError extends Error {
  constructor(reason: string) { super(`Unavailable page: ${reason}`); }
}

/**
 * HTTP 200 pages that carry no article at all: a client-side render that failed, a JavaScript wall, or a
 * bot wall. Anchored at the opening words, because the same sentences appear in real prose about outages
 * and about blocking; a body that merely mentions them later is still a body.
 */
const NO_ARTICLE: readonly RegExp[] = [
  /^A required part of this site couldn't load/i,
  /^(?:Please |You need to |You must )?enable JavaScript/i,
  /^Enable JavaScript and cookies to continue/i,
  /^JavaScript (?:is|must be) (?:disabled|enabled|turned on)/i,
  /^Verify you are (?:a )?human/i,
  /^Checking (?:your browser|if the site connection is secure)/i,
  /^Access to this page has been denied/i,
  /^Our systems have detected unusual (?:traffic|activity)/i,
  /^(?:Sorry, )?you have been blocked/i,
  /^Your (?:request|access) (?:has been|was) blocked/i,
  /^Before you continue to /i,
];

/** Match page-level error labels and observed interstitial templates, never keywords in prose. */
export function assertPageContent(title: string, text: string): void {
  const label = collapseWhitespace(title).split(/\s+[|—–-]\s+/)[0]!;
  if (/^(?:(?:error\s*)?(?:401|403|404|410|429|500|502|503|504)(?:\s*:?\s*(?:page )?(?:not found|forbidden|unauthorized|gone|too many requests|internal server error|bad gateway|service unavailable|gateway time-?out))?|(?:page )?not found|access denied|just a moment\.{0,3}|attention required!?|security verification)$/i.test(label)) {
    throw new UnavailablePageError(title);
  }
  const lead = collapseWhitespace(text);
  if (/^(?:[\w.-]+\s+)?Performing security verification This website uses a security service to protect against malicious bots\./i.test(lead)
    || /^We couldn't find the page you were looking for\. This is either because:/i.test(lead)) {
    throw new UnavailablePageError("error or security interstitial instead of content");
  }
  const empty = NO_ARTICLE.find((pattern) => pattern.test(lead));
  if (empty) throw new UnavailablePageError(`no article on the page: ${lead.slice(0, 60)}`);
}

/** Enough of the page's opening text for the interstitial templates above. */
const LEAD_CHARS = 1000;

type PageNode = { nodeType: number; nodeValue: string | null; localName?: string; childNodes: ArrayLike<PageNode> };

/** The text a page opens with, read from its tree: element boundaries separate words; scripts and styles are no text. */
function leadText(node: PageNode, out: string[] = [], length = { chars: 0 }): string {
  for (const child of Array.from(node.childNodes)) {
    if (length.chars >= LEAD_CHARS) break;
    if (child.nodeType === 3) {
      out.push(child.nodeValue ?? "");
      length.chars += child.nodeValue?.length ?? 0;
    } else if (child.nodeType === 1 && !["script", "style", "noscript", "template"].includes(child.localName ?? "")) {
      out.push(" ");
      leadText(child, out, length);
      out.push(" ");
    }
  }
  return out.join("");
}

/** The page, parsed once, after its title, main heading and opening text passed the boundary check. */
export function contentDocument(html: string) {
  const { document } = parseHTML(html);
  const body = document.querySelector("body");
  assertPageContent(document.querySelector("title")?.textContent ?? "", body ? leadText(body as unknown as PageNode) : stripTags(html));
  assertPageContent(document.querySelector("h1")?.textContent ?? "", "");
  return document;
}

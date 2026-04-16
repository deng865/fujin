// 敏感词与垃圾评论过滤 - 防止诈骗/侮辱/广告
const SCAM_PATTERNS = [
  /杀猪盘/gi,
  /投资理财/gi,
  /稳赚不赔/gi,
  /日赚\d+/gi,
  /月入\d+万/gi,
  /高额回报/gi,
  /保证盈利/gi,
  /免费领取/gi,
  /加我微信.*赚钱/gi,
  /私人.*转账/gi,
  /cryptocurrency.*guaranteed/gi,
  /wire.*transfer.*urgent/gi,
  /send.*money.*immediately/gi,
  /invest.*guaranteed.*return/gi,
];

// 极端侮辱词 → 直接拒绝
const INSULT_PATTERNS = [
  /骗子/gi,
  /垃圾/gi,
  /王八蛋/gi,
  /傻[逼比b]/gi,
  /狗[东东西娘日操]/gi,
  /操你/gi,
  /日你/gi,
  /草你/gi,
  /贱[人货]/gi,
  /婊子/gi,
  /滚蛋/gi,
  /去死/gi,
  /\bfuck\b/gi,
  /\bshit\b/gi,
  /\bidiot\b/gi,
  /\bscam(mer)?\b/gi,
];

// 广告/微信号/电话/随机数字
const SPAM_PATTERNS = [
  /微信[:：]?\s*[A-Za-z0-9_-]{5,}/gi,
  /[Ww][Ee][Cc][Hh][Aa][Tt][:：]?\s*[A-Za-z0-9_-]{5,}/gi,
  /\b1[3-9]\d{9}\b/g, // 中国手机号
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // 美国电话格式
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, // 邮箱
];

export type FilterResult =
  | { action: "allow"; cleanText: string }
  | { action: "block"; reason: string }
  | { action: "pending"; reason: string };

export function containsSensitiveContent(text: string): boolean {
  return SCAM_PATTERNS.some((p) => p.test(text));
}

export function classifyReviewContent(text: string): FilterResult {
  if (!text || !text.trim()) {
    return { action: "allow", cleanText: "" };
  }

  // 重置 lastIndex（global 标志会导致状态保留）
  for (const p of [...SCAM_PATTERNS, ...INSULT_PATTERNS, ...SPAM_PATTERNS]) {
    p.lastIndex = 0;
  }

  // 1. 诈骗或极端侮辱 → 直接 block
  if (SCAM_PATTERNS.some((p) => p.test(text))) {
    return { action: "block", reason: "评价包含可疑诈骗内容，无法发布" };
  }
  for (const p of INSULT_PATTERNS) p.lastIndex = 0;
  if (INSULT_PATTERNS.some((p) => p.test(text))) {
    return { action: "block", reason: "评价包含侮辱性词汇，请使用文明用语" };
  }

  // 2. 广告/联系方式/大量数字 → pending（人工审核队列）
  for (const p of SPAM_PATTERNS) p.lastIndex = 0;
  const hasContact = SPAM_PATTERNS.some((p) => p.test(text));
  // 大量随机数字 (≥10 位连续数字)
  const hasLongDigits = /\d{10,}/.test(text);

  if (hasContact || hasLongDigits) {
    return { action: "pending", reason: "评价包含联系方式，已提交人工审核" };
  }

  return { action: "allow", cleanText: text.trim() };
}

// 兼容旧 API
export function filterMessage(text: string): { safe: boolean; message: string } {
  if (containsSensitiveContent(text)) {
    return { safe: false, message: "消息包含敏感内容，无法发送" };
  }
  return { safe: true, message: text };
}

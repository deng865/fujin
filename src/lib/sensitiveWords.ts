// 敏感词过滤 - 防止诈骗信息
const SENSITIVE_PATTERNS = [
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

export function containsSensitiveContent(text: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
}

export function filterMessage(text: string): { safe: boolean; message: string } {
  if (containsSensitiveContent(text)) {
    return { safe: false, message: "消息包含敏感内容，无法发送" };
  }
  return { safe: true, message: text };
}

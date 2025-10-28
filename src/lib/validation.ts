import { z } from 'zod';

// Community post validation
export const communityPostSchema = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(200, "标题不能超过200字符"),
  content: z.string().trim().min(1, "内容不能为空").max(5000, "内容不能超过5000字符"),
  category: z.enum(['experience', 'question', 'announcement'], {
    errorMap: () => ({ message: "无效的分类" })
  })
});

// Ride creation validation
export const rideSchema = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(100, "标题不能超过100字符"),
  description: z.string().trim().max(1000, "描述不能超过1000字符").optional(),
  seats_available: z.number().int().min(1, "座位数至少为1").max(8, "座位数不能超过8").optional(),
  current_location: z.object({
    address: z.string().trim().min(1, "地址不能为空"),
    lat: z.number(),
    lng: z.number()
  }),
  to_location: z.object({
    address: z.string().trim().min(1, "地址不能为空"),
    lat: z.number(),
    lng: z.number()
  })
});

// Chat message validation
export const chatMessageSchema = z.object({
  message: z.string().trim().min(1, "消息不能为空").max(2000, "消息不能超过2000字符")
});

// Authentication validation
export const signUpSchema = z.object({
  email: z.string().trim().email("无效的邮箱地址").max(255, "邮箱地址过长"),
  password: z.string().min(6, "密码至少6个字符").max(72, "密码不能超过72字符"),
  name: z.string().trim().min(1, "姓名不能为空").max(100, "姓名不能超过100字符"),
  wechat_id: z.string().trim().max(100, "微信号不能超过100字符").optional(),
  phone: z.string().trim().max(20, "电话号码不能超过20字符").optional(),
  user_type: z.enum(['passenger', 'driver'], {
    errorMap: () => ({ message: "无效的用户类型" })
  })
});

export const signInSchema = z.object({
  email: z.string().trim().email("无效的邮箱地址"),
  password: z.string().min(1, "密码不能为空")
});

// Sanitize HTML content to prevent XSS
export function sanitizeHtml(html: string): string {
  // Basic sanitization - replace dangerous characters
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

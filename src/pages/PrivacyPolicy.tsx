import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const content = {
  zh: {
    title: "隐私政策",
    updated: "最后更新日期：2026年4月19日　生效日期：2026年4月19日",
    intro:
      "Fujin（"本应用"、"我们"）是一个面向北美华人社区的本地生活信息平台，由 Shuwen LLC 运营。我们高度重视您的隐私。本隐私政策详细说明我们在您使用本应用（包括 iOS、Android 及 Web 版本）时如何收集、使用、共享和保护您的个人信息。",
    sections: [
      {
        heading: "一、我们收集的信息",
        body: "为了向您提供服务，我们可能收集以下类别的信息：",
        list: [
          "<strong>账号与身份信息</strong>：电子邮箱、昵称、头像、用户类型（普通用户 / 司机 / 商家）、加密后的密码（仅邮箱注册）。如使用 Google / Apple 第三方登录，我们仅接收第三方提供的基础资料（邮箱、姓名、头像）。",
          "<strong>资料信息</strong>：您主动填写的微信号、电话、车型、车牌、车辆颜色等。",
          "<strong>精确位置信息（前台）</strong>：当您打开地图、查找附近服务、发布带定位的帖子或共享位置时，我们会获取您的 GPS 经纬度。",
          "<strong>精确位置信息（后台）</strong>：仅当您是"移动商家"或主动开启"实时位置共享"时，应用会在后台持续上报您的位置（每 30 秒至数分钟一次），用于让客户在地图上看到您当前所在位置或行程进度。您可以随时在系统设置或应用内"隐私设置 → 位置共享"中关闭此功能。",
          "<strong>麦克风音频</strong>：仅在您主动按下录音键发送语音消息，或在聊天页面发起 / 接听语音通话（基于 LiveKit）时被采集，且仅在录制期间。",
          "<strong>相机和照片</strong>：仅在您主动选择"拍照"或"从相册选择"以发布帖子、上传头像、举报附图、聊天发图或申诉证据时被访问。",
          "<strong>通知权限</strong>：用于推送新消息、来电、行程更新、订单状态等服务通知。",
          "<strong>设备与日志信息</strong>：设备型号、操作系统版本、应用版本、IP 地址、设备唯一标识符（用于防刷与去重，不与广告 ID 关联）、崩溃日志。",
          "<strong>使用记录</strong>：浏览历史、收藏、搜索词、点击行为、停留时长（用于反作弊与排序优化，不出售给第三方）。",
          "<strong>通讯内容</strong>：您在站内发送的文本、图片、语音、位置消息、行程信息（出于服务必要保留，仅参与对话双方可见）。",
        ],
      },
      {
        heading: "二、我们如何使用这些信息",
        list: [
          "提供、维护、改进核心功能：地图浏览、附近搜索、发帖、聊天、语音通话、位置共享、订单匹配。",
          "向您显示附近的商家、司机、房屋、招聘等信息。",
          "在移动商家上线或乘客与司机匹配后，向相关方显示实时位置。",
          "保障平台安全：识别欺诈、垃圾信息、多账号刷量、违规内容；对违规账号进行限制。",
          "发送服务相关通知（如新消息、来电、订单状态、安全提醒）。",
          "客户支持与申诉处理。",
          "遵守适用的法律法规及合法政府请求。",
        ],
      },
      {
        heading: "三、第三方服务商及数据共享",
        body: "我们不会出售您的个人信息。为了向您提供服务，必要数据会在严格的合同约束下与以下第三方服务商共享：",
        list: [
          "<strong>Supabase / Lovable Cloud</strong>（美国）：账号、资料、帖子、消息、收藏、评分等数据库存储与身份验证。",
          "<strong>Mapbox</strong>（美国）：地图瓦片渲染、地理编码、路线计算。会接收必要的位置坐标，但不与您的账号身份关联。",
          "<strong>Cloudflare R2</strong>（美国）：图片、视频、语音消息等媒体文件的对象存储。",
          "<strong>LiveKit</strong>（美国）：实时音视频通话的信令与媒体传输。通话内容默认不被录制。",
          "<strong>Google / Apple OAuth</strong>：仅在您选择社交登录时使用，依其各自隐私政策处理。",
          "<strong>Apple Push Notification Service / Firebase Cloud Messaging</strong>：发送推送通知。",
          "<strong>法律要求</strong>：当法律法规、法院命令或政府机关合法要求时披露。",
          "<strong>业务转让</strong>：在合并、收购或资产出售情况下，以与本政策一致的方式转让。",
        ],
      },
      {
        heading: "四、数据存储位置与跨境传输",
        body: "您的数据主要存储在美国的云服务器上。如果您从美国境外访问本服务，您的信息将被传输到美国并在美国处理。我们采用符合行业标准的安全措施保护跨境数据。",
      },
      {
        heading: "五、数据保留期限",
        list: [
          "<strong>账号信息</strong>：直至您主动注销账号；注销后 30 天内从生产环境删除（备份系统中至多保留 90 天后被覆盖）。",
          "<strong>聊天消息</strong>：保留至会话双方任一方注销账号；图片/视频/语音文件随消息撤回或账号注销同步删除。",
          "<strong>位置历史</strong>：实时位置坐标仅用于即时显示，不长期保留；历史 GPS 轨迹不被存档。",
          "<strong>日志与设备信息</strong>：最多保留 12 个月用于安全审计。",
          "<strong>评分与评论</strong>：商家退出后仍保留 30 天以维护信用记录完整性。",
        ],
      },
      {
        heading: "六、您的权利",
        body: "无论您身处何地，您均享有以下权利：",
        list: [
          "<strong>访问与更正</strong>：在"我的"页面查看与编辑个人资料。",
          "<strong>删除（被遗忘权）</strong>：在"隐私设置 → 注销账号"中一键删除账号及关联数据。",
          "<strong>撤回同意</strong>：随时关闭位置、麦克风、相机、相册、通知等系统权限。",
          "<strong>导出数据</strong>：发送邮件至 tao@shuwenllc.com 索取您的个人数据副本，我们将在 30 天内响应。",
          "<strong>限制处理 / 反对处理</strong>：通过邮件提出，我们会评估并响应。",
          "<strong>申诉</strong>：如对处理结果不满，可向您所在地区的数据保护监管机构投诉。",
        ],
      },
      {
        heading: "七、加州居民权利（CCPA / CPRA）",
        body: "如果您是加利福尼亚州居民，您额外享有：知悉收集类别的权利；要求删除个人信息的权利；不因行使权利而受歧视的权利；以及"不出售/不分享我的个人信息"的权利。我们声明：在过去 12 个月内未"出售"亦未"分享"您的个人信息以用于跨境定向广告。",
      },
      {
        heading: "八、欧盟 / 英国用户（GDPR / UK GDPR）",
        body: "如果您位于欧盟或英国，处理您个人数据的法律基础为：履行合同（提供服务）、合法利益（防欺诈与改进服务）、您的同意（位置、麦克风、相机、通知等敏感权限）和法律义务。您有权向所在国家/地区的数据保护机构投诉。我们的数据控制者为 Shuwen LLC（联系邮箱见文末）。",
      },
      {
        heading: "九、儿童隐私",
        body: "本应用不面向 13 岁以下儿童（在欧盟/英国为 16 岁以下）。我们不会故意收集此类儿童的个人信息。如您是父母或监护人并发现孩子向我们提供了个人信息，请立即联系我们，我们将尽快删除。",
      },
      {
        heading: "十、数据安全",
        body: "我们采用 HTTPS/TLS 加密传输、数据库行级安全策略（RLS）、加密密码哈希、敏感字段访问控制和定期安全审计来保护您的信息。但请注意，没有任何互联网传输或电子存储方式是 100% 安全的。",
      },
      {
        heading: "十一、Cookie 与本地存储",
        body: "我们使用浏览器 localStorage 保存您的登录会话、语言偏好、地图状态等，不使用第三方广告追踪 Cookie。",
      },
      {
        heading: "十二、政策更新",
        body: "我们可能会不定期更新本隐私政策。重大变更（如新增数据收集类别、新增第三方共享）将通过应用内通知或邮件提前告知。继续使用本应用即视为您接受更新后的政策。",
      },
      {
        heading: "十三、联系我们",
        body: "运营主体：Shuwen LLC\n隐私事务联系邮箱：tao@shuwenllc.com\n如您是加州或欧盟用户行使隐私权利，请在邮件主题注明"Privacy Request"。",
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: April 19, 2026　Effective: April 19, 2026",
    intro:
      "Fujin (the "App", "we", "us") is a hyper-local life-services platform for the North American Chinese-speaking community, operated by Shuwen LLC. This Privacy Policy explains in detail how we collect, use, share, and protect your personal information when you use the App on iOS, Android, or the web.",
    sections: [
      {
        heading: "1. Information We Collect",
        body: "To provide the service we may collect the following categories of information:",
        list: [
          "<strong>Account & Identity</strong>: Email, display name, avatar, user type (regular / driver / merchant), hashed password (email signup only). For Google / Apple sign-in we only receive the basic profile they provide (email, name, avatar).",
          "<strong>Profile Data</strong>: WeChat ID, phone number, vehicle model / plate / color you choose to add.",
          "<strong>Precise Location (Foreground)</strong>: When you open the map, search nearby, post a geo-tagged listing, or share a location, we collect your GPS coordinates.",
          "<strong>Precise Location (Background)</strong>: Only if you are a "Mobile Merchant" or have actively started "Live Location Sharing" in chat, the App reports your location in the background (every 30 seconds to a few minutes) so customers can see where you are or follow your trip. You may turn this off at any time in OS Settings or in-app under Privacy Settings → Location Sharing.",
          "<strong>Microphone</strong>: Captured only while you are recording a voice message or are actively in a voice call (powered by LiveKit).",
          "<strong>Camera & Photos</strong>: Accessed only when you tap "Take Photo" or "Choose from Library" to publish a post, change avatar, attach a report, send a chat photo, or upload dispute evidence.",
          "<strong>Notifications</strong>: Used to deliver new messages, incoming calls, trip updates, order status, and safety alerts.",
          "<strong>Device & Logs</strong>: Device model, OS version, app version, IP address, device unique identifier (used solely for anti-abuse / deduplication, not linked to ad IDs), crash logs.",
          "<strong>Usage Data</strong>: Browsing history, favorites, search terms, click patterns, dwell time (used for anti-fraud and ranking; never sold).",
          "<strong>Communication Content</strong>: Text, photos, voice, location messages, and trip information you send within the App. Visible only to the conversation participants.",
        ],
      },
      {
        heading: "2. How We Use Your Information",
        list: [
          "Provide, maintain, and improve core features: map browsing, nearby search, posting, chat, voice calls, live location sharing, ride matching.",
          "Show you nearby merchants, drivers, housing, and job listings.",
          "Display real-time location to relevant parties when a Mobile Merchant goes online or a passenger is matched with a driver.",
          "Keep the platform safe: detect fraud, spam, multi-account abuse, prohibited content; restrict violating accounts.",
          "Send service-related notifications (new messages, calls, order status, safety alerts).",
          "Customer support and dispute resolution.",
          "Comply with applicable law and lawful government requests.",
        ],
      },
      {
        heading: "3. Third-Party Service Providers & Data Sharing",
        body: "We do NOT sell your personal information. The following processors receive only the minimum data necessary to deliver the service, under strict contractual obligations:",
        list: [
          "<strong>Supabase / Lovable Cloud</strong> (USA): database storage and authentication for accounts, profiles, posts, messages, favorites, ratings.",
          "<strong>Mapbox</strong> (USA): map tile rendering, geocoding, routing. Receives location coordinates but not linked to your account identity.",
          "<strong>Cloudflare R2</strong> (USA): object storage for images, videos, and voice messages.",
          "<strong>LiveKit</strong> (USA): signaling and media transport for real-time voice calls. Calls are not recorded by default.",
          "<strong>Google / Apple OAuth</strong>: only when you choose social login; their respective privacy policies apply.",
          "<strong>Apple Push Notification Service / Firebase Cloud Messaging</strong>: delivery of push notifications.",
          "<strong>Legal Requirements</strong>: when required by law, court order, or lawful government request.",
          "<strong>Business Transfers</strong>: in a merger, acquisition, or asset sale, transferred under terms consistent with this policy.",
        ],
      },
      {
        heading: "4. Data Storage Location & International Transfers",
        body: "Your data is primarily stored on cloud servers in the United States. If you access the service from outside the US, your information will be transferred to and processed in the US. We apply industry-standard safeguards to such cross-border transfers.",
      },
      {
        heading: "5. Data Retention",
        list: [
          "<strong>Account data</strong>: kept until you delete your account; removed from production within 30 days of deletion (backups overwritten within 90 days).",
          "<strong>Chat messages</strong>: kept until either party deletes their account; media files are deleted upon message recall or account deletion.",
          "<strong>Location history</strong>: real-time coordinates are used only for instant display and are NOT archived as historical GPS tracks.",
          "<strong>Logs & device info</strong>: retained for up to 12 months for security auditing.",
          "<strong>Ratings & reviews</strong>: retained for 30 days after a merchant exits to preserve credit history integrity.",
        ],
      },
      {
        heading: "6. Your Rights",
        body: "Wherever you are located, you have the following rights:",
        list: [
          "<strong>Access & Correct</strong>: view and edit your profile in the Profile page.",
          "<strong>Delete (Right to be Forgotten)</strong>: one-tap account deletion under Privacy Settings → Delete Account.",
          "<strong>Withdraw Consent</strong>: revoke Location, Microphone, Camera, Photos, or Notifications permission at any time in OS Settings.",
          "<strong>Data Portability</strong>: email tao@shuwenllc.com to request a copy of your personal data; we respond within 30 days.",
          "<strong>Restrict / Object</strong>: submit by email; we will evaluate and respond.",
          "<strong>Lodge a Complaint</strong>: with your local data-protection authority if you disagree with our handling.",
        ],
      },
      {
        heading: "7. California Residents (CCPA / CPRA)",
        body: "If you are a California resident, you additionally have: the right to know the categories collected; the right to delete; the right to non-discrimination; and the right to opt out of "sale" or "sharing" of personal information. We disclose that in the past 12 months we have NOT "sold" or "shared" your personal information for cross-context behavioral advertising.",
      },
      {
        heading: "8. EU / UK Users (GDPR / UK GDPR)",
        body: "If you are in the EEA or UK, the legal bases for processing are: performance of a contract (delivering the service), legitimate interests (fraud prevention and product improvement), your consent (location, microphone, camera, notifications), and legal obligations. You may lodge a complaint with your supervisory authority. The data controller is Shuwen LLC (contact below).",
      },
      {
        heading: "9. Children's Privacy",
        body: "The App is not directed to children under 13 (or under 16 in the EEA/UK). We do not knowingly collect personal information from such children. If you are a parent or guardian and learn that your child has provided us with personal information, please contact us and we will delete it promptly.",
      },
      {
        heading: "10. Security",
        body: "We protect your information with HTTPS/TLS in transit, database row-level security (RLS), salted password hashing, access controls on sensitive fields, and periodic security audits. However, no method of internet transmission or electronic storage is 100% secure.",
      },
      {
        heading: "11. Cookies & Local Storage",
        body: "We use browser localStorage to remember your login session, language, and map state. We do NOT use third-party advertising-tracking cookies.",
      },
      {
        heading: "12. Policy Updates",
        body: "We may update this Privacy Policy from time to time. Material changes (new data categories, new third-party sharing) will be announced via in-app notification or email in advance. Continued use after the effective date constitutes acceptance.",
      },
      {
        heading: "13. Contact Us",
        body: "Operator: Shuwen LLC\nPrivacy contact: tao@shuwenllc.com\nFor California or EU privacy rights requests, please mark the email subject as "Privacy Request".",
      },
    ],
  },
};

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<"zh" | "en">("zh");
  const c = content[lang];

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div className="shrink-0 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1">{c.title}</h1>
        <button
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted hover:bg-accent transition-colors font-medium"
        >
          {lang === "zh" ? "EN" : "中文"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-2xl mx-auto px-5 py-6 space-y-6 text-sm text-foreground/90 leading-relaxed pb-24">
          <p className="text-muted-foreground">{c.updated}</p>
          <p>{c.intro}</p>
          {c.sections.map((s: any, i: number) => (
            <section key={i} className="space-y-2">
              <h2 className="text-base font-semibold">{s.heading}</h2>
              {s.body && s.body.split("\n").map((line: string, j: number) => (
                <p key={j}>{line}</p>
              ))}
              {s.list && (
                <ul className="list-disc pl-5 space-y-1">
                  {s.list.map((item: string, j: number) => (
                    <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

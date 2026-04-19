import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const content = {
  zh: {
    title: "服务条款",
    updated: "最后更新日期：2026年4月19日　生效日期：2026年4月19日",
    intro:
      "欢迎使用 Fujin（以下简称"本应用"）。本应用由 Shuwen LLC 运营，是面向北美华人社区的本地生活信息平台。在使用本应用前，请您仔细阅读并同意本《服务条款》。一旦您注册、登录或使用本应用，即视为您已阅读、理解并同意接受本条款及《隐私政策》的全部内容。",
    sections: [
      {
        heading: "一、服务描述",
        body: "本应用提供基于地理位置的本地生活信息发布与发现服务，包括但不限于：餐饮、美容美发、出行（拼车/司机）、房屋租售、招聘、法律咨询、家政、维修等服务的发布、搜索、收藏；用户间即时聊天、语音消息、语音通话、位置共享、行程协调与评分。本应用仅为信息撮合平台，不参与用户间的实际线下交易，亦不对交易结果作任何担保。",
      },
      {
        heading: "二、年龄要求",
        body: "本应用面向 17 岁及以上用户。如您未满 17 岁，请勿注册或使用本应用。我们保留要求验证年龄的权利，并将立即删除已知未成年用户的账号。在涉及不公开聊天、用户生成内容（UGC）和成人服务交易撮合等场景中，App Store 评级为 17+。",
      },
      {
        heading: "三、账号注册与安全",
        list: [
          "您可使用电子邮箱、Google 或 Apple 账号注册。注册资料须真实、准确、完整。",
          "您应妥善保管账号密码，对账号下发生的所有行为承担责任。",
          "如发现账号被盗用或异常登录，请立即联系我们。",
          "禁止出借、出租、转让账号，禁止使用机器或自动化工具批量注册。",
        ],
      },
      {
        heading: "四、用户行为规范（零容忍政策）",
        body: "为维护社区健康，您承诺不会发布、上传或传播以下内容；一经发现立即下架，严重者永久封禁账号：",
        list: [
          "色情、淫秽、性暗示或对未成年人有害的内容；",
          "暴力、血腥、虐待、自残或鼓励他人自伤的内容；",
          "种族、民族、宗教、性别、性取向歧视或仇恨言论；",
          "骚扰、霸凌、跟踪、人身威胁或公开他人隐私（如未授权的电话、住址、身份证号）；",
          "诈骗、传销、虚假广告、刷单或误导性信息；",
          "毒品、武器、赌博、伪造证件、走私货物、未经许可的医疗药品等违法商品/服务；",
          "侵犯他人知识产权、商标、肖像权的内容；",
          "冒充他人或虚假代表某机构；",
          "恶意软件、钓鱼链接、对平台或他人系统的攻击行为；",
          "任何违反美国联邦及州法律、您所在司法辖区法律的行为或内容。",
        ],
      },
      {
        heading: "五、用户生成内容（UGC）与举报机制",
        body: "本应用允许用户发布帖子、聊天、评论与评分（统称"用户内容"）。我们承诺：",
        list: [
          "<strong>事前过滤</strong>：所有新发布的帖子在管理员审核通过前默认不公开。",
          "<strong>关键词与图像识别</strong>：对常见违禁词与可疑媒体执行自动检测。",
          "<strong>举报入口</strong>：每条帖子、每位用户、每条聊天消息均提供"举报"按钮（位于详情页右上角的菜单中）。",
          "<strong>屏蔽用户</strong>：您可在聊天页面或对方资料页屏蔽任意用户，对方将无法再向您发起对话。",
          "<strong>24 小时响应</strong>：我们承诺在收到合法举报后 24 小时内审核处理，违规内容立即下架，违规账号视情节封禁 7 天 / 30 天 / 永久。",
          "<strong>申诉</strong>：被处理的用户可通过 tao@shuwenllc.com 提交申诉，我们将在 7 个工作日内复核回复。",
        ],
      },
      {
        heading: "六、移动商家、司机与线下交易免责",
        list: [
          "本应用为移动商家与司机提供位置展示与即时通讯工具，不对其身份、资质、车辆状况、技能水平、保险情况进行背景调查或担保。",
          "拼车、家政、维修等服务均为用户间私人约定，由当事人自行评估风险并自负责任。",
          "请您在线下交易前自行核实对方身份、价格、服务范围；建议在公开场所交易、保留沟通记录、使用受保护的支付方式。",
          "本应用不对线下交易引发的任何人身伤害、财产损失、合同纠纷承担责任。",
        ],
      },
      {
        heading: "七、位置共享与隐私选项",
        list: [
          "位置功能完全基于您的自愿授权；首次使用时系统会请求权限。",
          '"移动商家"模式与"实时位置共享"模式会在后台持续上报您的位置，您可在"隐私设置 → 位置共享"或系统设置中随时关闭。',
          "您可在每条帖子上选择"精确位置"或"模糊位置"（约 110-330 米偏移）以保护住址隐私。",
        ],
      },
      {
        heading: "八、知识产权",
        list: [
          "本应用的代码、设计、商标、Logo 归 Shuwen LLC 所有。",
          "您发布的用户内容版权仍归您本人；但您授予我们一项全球性、非独占、免版税、可再许可的许可，用于在本应用内展示、复制、分发、改编（如生成缩略图）该内容。",
          "如您认为本应用上有内容侵犯了您的版权，请发送 DMCA 通知至 tao@shuwenllc.com。",
        ],
      },
      {
        heading: "九、付费功能与退款（如适用）",
        body: '如本应用未来推出付费功能或虚拟商品，将通过 Apple / Google 应用内购买系统结算。所有应用内购买遵循对应平台的条款与退款政策（Apple App Store / Google Play）。本应用提供的所有功能在首次发布版本中均为免费。',
      },
      {
        heading: "十、服务可用性与变更",
        body: "我们尽力保持服务持续可用，但不保证 100% 无中断。我们可能因维护、升级、不可抗力暂停服务，并保留增加、修改、限制、终止部分或全部功能的权利，且不承担相应责任。",
      },
      {
        heading: "十一、账号暂停与终止",
        body: "我们保留在以下情况下暂停或终止您账号的权利：",
        list: [
          "违反本服务条款或社区规范；",
          "经举报核实存在欺诈、骚扰、色情、暴力等行为；",
          "长期不活跃（连续 24 个月未登录）；",
          "依法律或主管机关要求。",
        ],
        extra: '您可随时通过"隐私设置 → 注销账号"功能自助删除账号；删除后所有关联数据将按隐私政策约定清除。',
      },
      {
        heading: "十二、免责声明",
        body: '本应用按"现状"和"现有"基础提供，不作任何明示或暗示的保证，包括但不限于适销性、特定用途适用性、不侵权、不间断或无错误。',
      },
      {
        heading: "十三、责任限制",
        body: "在适用法律允许的最大范围内，Shuwen LLC 及其管理人员、员工、关联方对您因使用或无法使用本应用而产生的任何间接、附带、特殊、惩罚性或后果性损害不承担责任；我们的累计赔偿责任以您过去 12 个月内向本应用支付的费用为限（如未付费则以 50 美元为限）。",
      },
      {
        heading: "十四、赔偿",
        body: "您同意就因您违反本条款、违反法律或侵犯他人权利而引起的任何索赔、损失、责任与费用（包括合理律师费）对 Shuwen LLC 进行赔偿。",
      },
      {
        heading: "十五、Apple App Store 附加条款",
        body: "如您通过 Apple App Store 下载本应用，您理解：本条款仅在您与 Shuwen LLC 之间订立，与 Apple 无关；Apple 对本应用及其内容不承担任何责任；维护与支持服务由 Shuwen LLC 提供；产品保证义务由 Shuwen LLC 承担；任何与产品相关的索赔（包括产品责任、未达到适用法律要求、违反消费者保护法）由 Shuwen LLC 处理；如因第三方主张本应用侵犯其知识产权，由 Shuwen LLC 负责调查与抗辩；Apple 及其子公司是本条款的第三方受益人，有权强制执行本条款。",
      },
      {
        heading: "十六、适用法律与争议解决",
        body: "本条款受美国德克萨斯州法律管辖，不考虑法律冲突原则。因本条款引起的任何争议，应首先通过友好协商解决；协商不成的，提交位于德州达拉斯郡的法院专属管辖。如您是消费者，您仍享有所在地法律赋予的强制性消费者权利。",
      },
      {
        heading: "十七、条款变更",
        body: "我们可能不定期更新本条款。重大变更将通过应用内通知或邮件提前告知。变更生效后，您继续使用本应用即视为接受变更后的条款。",
      },
      {
        heading: "十八、联系我们",
        body: "运营主体：Shuwen LLC\n地址：Texas, USA\n电子邮箱：tao@shuwenllc.com",
      },
    ],
  },
  en: {
    title: "Terms of Service",
    updated: "Last updated: April 19, 2026　Effective: April 19, 2026",
    intro:
      "Welcome to Fujin (the "App"), operated by Shuwen LLC, a hyper-local life-services platform for the North American Chinese-speaking community. By registering, signing in, or using the App you confirm that you have read, understood, and agreed to these Terms of Service and the Privacy Policy.",
    sections: [
      {
        heading: "1. Service Description",
        body: "The App provides geo-based local life-services posting and discovery, including but not limited to: dining, beauty, ride-share/drivers, housing, jobs, legal, home services, repairs; plus user-to-user chat, voice messages, voice calls, live location sharing, trip coordination, and ratings. The App is solely an information broker and does NOT participate in or guarantee any offline transactions.",
      },
      {
        heading: "2. Age Requirement",
        body: "The App is intended for users aged 17 and above. If you are under 17, do not register or use the App. We reserve the right to verify age and will delete known underage accounts immediately. The App is rated 17+ on the App Store due to unrestricted chat, user-generated content, and adult-service brokerage.",
      },
      {
        heading: "3. Account Registration & Security",
        list: [
          "You may register via email, Google, or Apple. Registration information must be true, accurate, and complete.",
          "You are responsible for safeguarding your password and for all activity under your account.",
          "Notify us immediately of any unauthorized access.",
          "You may not lend, rent, transfer your account, or use bots/automation to bulk-register.",
        ],
      },
      {
        heading: "4. User Conduct (Zero-Tolerance)",
        body: "To keep the community safe, you agree NOT to post, upload, or transmit any of the following. Violations result in immediate takedown and may lead to permanent ban:",
        list: [
          "Pornography, obscenity, sexual suggestion, or content harmful to minors;",
          "Violence, gore, abuse, self-harm, or content encouraging self-harm;",
          "Racial, ethnic, religious, gender, or sexual-orientation discrimination or hate speech;",
          "Harassment, bullying, stalking, threats, or doxxing (publishing others' private information without consent);",
          "Fraud, pyramid schemes, false advertising, fake reviews, or misleading information;",
          "Drugs, weapons, gambling, forged documents, smuggled goods, unlicensed pharmaceuticals, or other illegal goods/services;",
          "Content that infringes intellectual property, trademarks, or rights of publicity;",
          "Impersonation of others or false representation of an organization;",
          "Malware, phishing, attacks against the platform or other users' systems;",
          "Any conduct or content that violates U.S. federal, state, or your local laws.",
        ],
      },
      {
        heading: "5. User-Generated Content (UGC) & Reporting",
        body: "The App lets users publish posts, chat, comments, and ratings ("User Content"). We commit to:",
        list: [
          "<strong>Pre-moderation</strong>: all new posts default to hidden until an administrator approves.",
          "<strong>Keyword & image filtering</strong>: automated detection of common prohibited terms and suspicious media.",
          "<strong>Reporting</strong>: every post, every user, and every chat message has a "Report" entry (in the menu at the top right of the detail view).",
          "<strong>Block users</strong>: you may block any user from their chat page or profile; they will no longer be able to message you.",
          "<strong>24-hour response</strong>: we commit to reviewing valid reports within 24 hours; violating content is removed immediately and offending accounts are suspended for 7 days / 30 days / permanently depending on severity.",
          "<strong>Appeals</strong>: affected users may appeal to tao@shuwenllc.com; we will respond within 7 business days.",
        ],
      },
      {
        heading: "6. Mobile Merchants, Drivers & Offline Transaction Disclaimer",
        list: [
          "The App offers location display and messaging tools to mobile merchants and drivers; we do NOT perform background checks or warrant their identity, qualifications, vehicle condition, skill level, or insurance.",
          "Ride-share, home services, repairs and the like are private arrangements between users; you assess and assume the risk yourself.",
          "Verify the other party's identity, price, and scope before any offline transaction; we recommend meeting in public places, keeping records, and using protected payment methods.",
          "The App is not liable for any personal injury, property loss, or contractual dispute arising from offline transactions.",
        ],
      },
      {
        heading: "7. Location Sharing & Privacy Options",
        list: [
          "Location features rely entirely on your voluntary permission; the OS will request consent on first use.",
          'In "Mobile Merchant" mode and "Live Location Sharing" mode the App reports your location in the background; you can disable these any time in Privacy Settings → Location Sharing or in OS Settings.',
          'On each listing you may choose "Precise Location" or "Fuzzy Location" (offset by ~110-330 m) to protect your home address privacy.',
        ],
      },
      {
        heading: "8. Intellectual Property",
        list: [
          "The App's code, design, trademarks, and logos are owned by Shuwen LLC.",
          "You retain copyright in your User Content but grant us a worldwide, non-exclusive, royalty-free, sublicensable license to display, copy, distribute, and adapt (e.g., generating thumbnails) such content within the App.",
          "If you believe content on the App infringes your copyright, send a DMCA notice to tao@shuwenllc.com.",
        ],
      },
      {
        heading: "9. Paid Features & Refunds (if applicable)",
        body: "If the App later introduces paid features or virtual goods, billing will go through Apple / Google in-app purchases. All such purchases are subject to the platform's own terms and refund policies (Apple App Store / Google Play). All features in the initial release are free.",
      },
      {
        heading: "10. Service Availability & Changes",
        body: "We strive to keep the service available but do not guarantee 100% uptime. We may suspend the service for maintenance, upgrades, or force majeure, and reserve the right to add, modify, restrict, or terminate any feature without liability.",
      },
      {
        heading: "11. Account Suspension & Termination",
        body: "We may suspend or terminate your account if:",
        list: [
          "you violate these Terms or the community guidelines;",
          "investigation confirms fraud, harassment, sexual, or violent conduct;",
          "the account is inactive for 24 consecutive months;",
          "required by law or competent authority.",
        ],
        extra: 'You may self-delete your account at any time via Privacy Settings → Delete Account; associated data is removed per the Privacy Policy.',
      },
      {
        heading: "12. Disclaimers",
        body: 'The App is provided "as is" and "as available" without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, non-infringement, uninterrupted or error-free operation.',
      },
      {
        heading: "13. Limitation of Liability",
        body: "To the maximum extent permitted by law, Shuwen LLC and its officers, employees, and affiliates shall not be liable for any indirect, incidental, special, punitive, or consequential damages arising from use of or inability to use the App. Our aggregate liability is limited to the amount you paid to the App in the prior 12 months (or US$50 if you paid nothing).",
      },
      {
        heading: "14. Indemnification",
        body: "You agree to indemnify Shuwen LLC against any claim, loss, liability, or expense (including reasonable attorneys' fees) arising from your breach of these Terms, violation of law, or infringement of third-party rights.",
      },
      {
        heading: "15. Apple App Store Additional Terms",
        body: "If you obtained the App from the Apple App Store, you acknowledge: these Terms are between you and Shuwen LLC only, not with Apple; Apple has no responsibility for the App or its content; maintenance and support are provided by Shuwen LLC; product warranty is the obligation of Shuwen LLC; any product-related claim (product liability, failure to conform to applicable law, consumer protection claims) shall be addressed by Shuwen LLC; if a third party claims the App infringes their intellectual property, Shuwen LLC shall be responsible for investigation and defense; Apple and its subsidiaries are third-party beneficiaries of these Terms with the right to enforce them.",
      },
      {
        heading: "16. Governing Law & Dispute Resolution",
        body: "These Terms are governed by the laws of the State of Texas, USA, without regard to conflict-of-law principles. Disputes shall first be resolved through good-faith negotiation; failing that, the courts located in Dallas County, Texas shall have exclusive jurisdiction. If you are a consumer, you retain mandatory consumer rights granted by your local law.",
      },
      {
        heading: "17. Changes to Terms",
        body: "We may update these Terms from time to time. Material changes will be announced via in-app notification or email in advance. Continued use after the effective date constitutes acceptance.",
      },
      {
        heading: "18. Contact Us",
        body: "Operator: Shuwen LLC\nAddress: Texas, USA\nEmail: tao@shuwenllc.com",
      },
    ],
  },
};

export default function TermsOfService() {
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
              {s.extra && <p>{s.extra}</p>}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

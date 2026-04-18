import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const content = {
  zh: {
    title: "隐私政策",
    updated: "最后更新日期：2026年4月11日",
    sections: [
      {
        heading: "一、我们收集的信息",
        body: "为了向您提供服务，我们可能收集以下信息：",
        list: [
          "<strong>账号信息</strong>：您的电子邮箱、用户名、头像等注册信息。",
          "<strong>位置数据</strong>：在您授权后，我们会获取您的地理位置，用于展示附近的服务和信息。",
          "<strong>设备信息</strong>：设备标识符（Device ID）、操作系统版本、浏览器类型。",
          "<strong>通讯内容</strong>：您在平台上发送的聊天消息（用于提供即时通讯服务）。",
          "<strong>发布内容</strong>：您发布的帖子、图片及相关联系方式。",
        ],
      },
      {
        heading: "二、信息用途",
        body: "我们使用收集的信息用于：",
        list: [
          "提供、维护和改进我们的服务。",
          "根据您的位置展示附近的服务提供者和商家信息。",
          "实现用户间的即时通讯和通话功能。",
          "保障平台安全，防止欺诈和滥用行为。",
          "发送必要的服务通知。",
        ],
      },
      {
        heading: "三、信息共享与披露",
        body: "我们不会出售您的个人信息。在以下情况下，我们可能共享您的信息：",
        list: [
          "经您同意或应您的要求。",
          "与为我们提供服务的第三方合作伙伴（如云存储、地图服务）共享必要信息。",
          "为遵守法律法规、法律程序或政府要求。",
          "为保护我们的权利、隐私、安全或财产。",
        ],
      },
      {
        heading: "四、数据存储与安全",
        body: "我们采取合理的技术和管理措施来保护您的个人信息，包括数据加密、访问控制和安全审计。您的数据存储在安全的云服务器上。",
      },
      {
        heading: "五、用户权利",
        body: "您享有以下权利：",
        list: [
          "<strong>访问权</strong>：您可以在个人中心查看您的个人信息。",
          "<strong>修改权</strong>：您可以随时修改您的个人资料。",
          "<strong>删除权</strong>：您可以在隐私设置中注销账号，我们将删除您的相关数据。",
          "<strong>撤回同意</strong>：您可以随时关闭位置共享等权限。",
        ],
      },
      {
        heading: "六、Cookie 与本地存储",
        body: "我们使用本地存储（localStorage）来保存您的登录状态和偏好设置。这些数据仅存储在您的设备上。",
      },
      {
        heading: "七、儿童隐私",
        body: "我们的服务不面向13岁以下的儿童。我们不会故意收集13岁以下儿童的个人信息。如果我们发现已收集此类信息，将会尽快删除。",
      },
      {
        heading: "八、隐私政策更新",
        body: "我们可能会不时更新本隐私政策。更新后的政策将在本页面发布，重大变更时我们会通过应用内通知告知您。",
      },
      {
        heading: "九、联系我们",
        body: "如果您对本隐私政策有任何疑问，请通过以下方式联系我们：\n电子邮箱：tao@shuwenllc.com",
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: April 11, 2026",
    sections: [
      {
        heading: "1. Information We Collect",
        body: "To provide our services, we may collect the following information:",
        list: [
          "<strong>Account Information</strong>: Your email address, username, avatar, and other registration details.",
          "<strong>Location Data</strong>: With your permission, we collect your geolocation to display nearby services and information.",
          "<strong>Device Information</strong>: Device identifiers (Device ID), operating system version, and browser type.",
          "<strong>Communication Content</strong>: Chat messages sent on the platform (to provide instant messaging services).",
          "<strong>Published Content</strong>: Posts, images, and contact information you publish.",
        ],
      },
      {
        heading: "2. How We Use Information",
        body: "We use the collected information to:",
        list: [
          "Provide, maintain, and improve our services.",
          "Display nearby service providers and business information based on your location.",
          "Enable instant messaging and calling features between users.",
          "Ensure platform security and prevent fraud and abuse.",
          "Send necessary service notifications.",
        ],
      },
      {
        heading: "3. Information Sharing & Disclosure",
        body: "We do not sell your personal information. We may share your information in the following circumstances:",
        list: [
          "With your consent or at your request.",
          "With third-party partners who provide services to us (e.g., cloud storage, map services) sharing necessary information.",
          "To comply with laws, regulations, legal processes, or government requests.",
          "To protect our rights, privacy, safety, or property.",
        ],
      },
      {
        heading: "4. Data Storage & Security",
        body: "We take reasonable technical and administrative measures to protect your personal information, including data encryption, access control, and security audits. Your data is stored on secure cloud servers.",
      },
      {
        heading: "5. User Rights",
        body: "You have the following rights:",
        list: [
          "<strong>Right of Access</strong>: You can view your personal information in your profile.",
          "<strong>Right to Modify</strong>: You can modify your profile at any time.",
          "<strong>Right to Delete</strong>: You can delete your account in privacy settings, and we will remove your related data.",
          "<strong>Right to Withdraw Consent</strong>: You can disable location sharing and other permissions at any time.",
        ],
      },
      {
        heading: "6. Cookies & Local Storage",
        body: "We use local storage (localStorage) to save your login status and preference settings. This data is stored only on your device.",
      },
      {
        heading: "7. Children's Privacy",
        body: "Our services are not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If we discover that such information has been collected, we will delete it promptly.",
      },
      {
        heading: "8. Policy Updates",
        body: "We may update this Privacy Policy from time to time. Updated policies will be posted on this page, and we will notify you of significant changes through in-app notifications.",
      },
      {
        heading: "9. Contact Us",
        body: "If you have any questions about this Privacy Policy, please contact us at:\nEmail: tao@shuwenllc.com",
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
          {c.sections.map((s, i) => (
            <section key={i} className="space-y-2">
              <h2 className="text-base font-semibold">{s.heading}</h2>
              {s.body.split("\n").map((line, j) => (
                <p key={j}>{line}</p>
              ))}
              {s.list && (
                <ul className="list-disc pl-5 space-y-1">
                  {s.list.map((item, j) => (
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

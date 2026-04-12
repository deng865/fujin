import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const content = {
  zh: {
    title: "服务条款",
    updated: "最后更新日期：2026年4月11日",
    sections: [
      {
        heading: "一、服务描述",
        body: "本平台是一个面向华人社区的本地化生活服务平台，帮助用户发现和发布附近的各类服务信息，包括但不限于餐饮、美容、出行、房屋、法律咨询、招聘等。",
      },
      {
        heading: "二、用户账号",
        list: [
          "您需要注册账号才能使用部分功能。",
          "您有责任保管好您的账号信息，并对账号下的所有活动负责。",
          "每个用户在同一分类下仅可发布一条有效信息。",
        ],
      },
      {
        heading: "三、用户行为规范",
        body: "使用本平台时，您同意不会：",
        list: [
          "发布虚假、误导性或欺诈性的信息。",
          "发布涉及违法活动、色情、暴力或其他不当内容。",
          "骚扰、威胁或侵犯其他用户的权益。",
          "使用自动化工具批量操作或干扰平台正常运行。",
          "冒充他人或虚假陈述与他人的关联。",
        ],
      },
      {
        heading: "四、用户发布内容",
        list: [
          "您对您发布的所有内容负责，包括文字、图片和联系方式。",
          "您授予我们在平台上展示和分发您发布内容的非独占许可。",
          "我们有权删除违反本条款或社区规范的内容，无需事先通知。",
          "被举报且经审核确认违规的内容将被下架处理。",
        ],
      },
      {
        heading: "五、免责声明",
        list: [
          "本平台仅提供信息展示和连接服务，不对用户间交易的质量、安全或合法性承担责任。",
          "我们不对用户发布内容的准确性、完整性或可靠性作出保证。",
          "用户在使用平台服务过程中产生的任何纠纷，应由相关当事人自行解决。",
          '服务按"原样"提供，我们不作任何明示或暗示的保证。',
        ],
      },
      {
        heading: "六、责任限制",
        body: "在法律允许的最大范围内，我们对因使用或无法使用本服务而导致的任何间接、附带、特殊或后果性损害不承担责任。",
      },
      {
        heading: "七、账号终止",
        body: "我们保留在以下情况下暂停或终止您账号的权利：",
        list: [
          "违反本服务条款的任何规定。",
          "存在欺诈或其他不当行为。",
          "长期不活跃的账号。",
        ],
        extra: '您也可以随时通过隐私设置中的"注销账号"功能删除您的账号。',
      },
      {
        heading: "八、条款修改",
        body: "我们保留随时修改本服务条款的权利。修改后的条款将在本页面发布。继续使用本服务即表示您接受修改后的条款。",
      },
      {
        heading: "九、适用法律",
        body: "本服务条款受适用法律管辖。因本条款引起的任何争议，应通过友好协商解决；协商不成的，提交有管辖权的法院裁决。",
      },
      {
        heading: "十、联系我们",
        body: "如果您对本服务条款有任何疑问，请通过以下方式联系我们：\n电子邮箱：tao@shuwenllc.com",
      },
    ],
  },
  en: {
    title: "Terms of Service",
    updated: "Last updated: April 11, 2026",
    sections: [
      {
        heading: "1. Service Description",
        body: "This platform is a localized life services platform for the Chinese community, helping users discover and publish various nearby service information, including but not limited to dining, beauty, transportation, housing, legal consultation, and recruitment.",
      },
      {
        heading: "2. User Accounts",
        list: [
          "You must register an account to use certain features.",
          "You are responsible for safeguarding your account information and for all activities under your account.",
          "Each user may only publish one active listing per category.",
        ],
      },
      {
        heading: "3. User Conduct",
        body: "When using this platform, you agree not to:",
        list: [
          "Post false, misleading, or fraudulent information.",
          "Post content involving illegal activities, pornography, violence, or other inappropriate content.",
          "Harass, threaten, or infringe on the rights of other users.",
          "Use automated tools for bulk operations or interfere with the platform's normal operation.",
          "Impersonate others or misrepresent your association with others.",
        ],
      },
      {
        heading: "4. User-Published Content",
        list: [
          "You are responsible for all content you publish, including text, images, and contact information.",
          "You grant us a non-exclusive license to display and distribute your published content on the platform.",
          "We reserve the right to remove content that violates these terms or community guidelines without prior notice.",
          "Content that is reported and confirmed to be in violation will be taken down.",
        ],
      },
      {
        heading: "5. Disclaimers",
        list: [
          "This platform only provides information display and connection services and is not responsible for the quality, safety, or legality of transactions between users.",
          "We make no guarantees regarding the accuracy, completeness, or reliability of user-published content.",
          "Any disputes arising from the use of platform services shall be resolved by the parties involved.",
          'Services are provided "as is" without any express or implied warranties.',
        ],
      },
      {
        heading: "6. Limitation of Liability",
        body: "To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use this service.",
      },
      {
        heading: "7. Account Termination",
        body: "We reserve the right to suspend or terminate your account under the following circumstances:",
        list: [
          "Violation of any provision of these Terms of Service.",
          "Fraudulent or other improper behavior.",
          "Prolonged inactivity.",
        ],
        extra: 'You may also delete your account at any time through the "Delete Account" option in Privacy Settings.',
      },
      {
        heading: "8. Modifications to Terms",
        body: "We reserve the right to modify these Terms of Service at any time. Modified terms will be posted on this page. Continued use of the service constitutes your acceptance of the modified terms.",
      },
      {
        heading: "9. Governing Law",
        body: "These Terms of Service are governed by applicable law. Any disputes arising from these terms shall be resolved through amicable negotiation; if negotiation fails, they shall be submitted to a court of competent jurisdiction.",
      },
      {
        heading: "10. Contact Us",
        body: "If you have any questions about these Terms of Service, please contact us at:\nEmail: tao@shuwenllc.com",
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
      <div className="shrink-0 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
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

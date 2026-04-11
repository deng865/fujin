import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">服务条款</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6 text-sm text-foreground/90 leading-relaxed pb-24">
        <p className="text-muted-foreground">最后更新日期：2026年4月11日</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">一、服务描述</h2>
          <p>本平台是一个面向华人社区的本地化生活服务平台，帮助用户发现和发布附近的各类服务信息，包括但不限于餐饮、美容、出行、房屋、法律咨询、招聘等。</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">二、用户账号</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>您需要注册账号才能使用部分功能。</li>
            <li>您有责任保管好您的账号信息，并对账号下的所有活动负责。</li>
            <li>每个用户在同一分类下仅可发布一条有效信息。</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">三、用户行为规范</h2>
          <p>使用本平台时，您同意不会：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>发布虚假、误导性或欺诈性的信息。</li>
            <li>发布涉及违法活动、色情、暴力或其他不当内容。</li>
            <li>骚扰、威胁或侵犯其他用户的权益。</li>
            <li>使用自动化工具批量操作或干扰平台正常运行。</li>
            <li>冒充他人或虚假陈述与他人的关联。</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">四、用户发布内容</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>您对您发布的所有内容负责，包括文字、图片和联系方式。</li>
            <li>您授予我们在平台上展示和分发您发布内容的非独占许可。</li>
            <li>我们有权删除违反本条款或社区规范的内容，无需事先通知。</li>
            <li>被举报且经审核确认违规的内容将被下架处理。</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">五、免责声明</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>本平台仅提供信息展示和连接服务，不对用户间交易的质量、安全或合法性承担责任。</li>
            <li>我们不对用户发布内容的准确性、完整性或可靠性作出保证。</li>
            <li>用户在使用平台服务过程中产生的任何纠纷，应由相关当事人自行解决。</li>
            <li>服务按"原样"提供，我们不作任何明示或暗示的保证。</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">六、责任限制</h2>
          <p>在法律允许的最大范围内，我们对因使用或无法使用本服务而导致的任何间接、附带、特殊或后果性损害不承担责任。</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">七、账号终止</h2>
          <p>我们保留在以下情况下暂停或终止您账号的权利：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>违反本服务条款的任何规定。</li>
            <li>存在欺诈或其他不当行为。</li>
            <li>长期不活跃的账号。</li>
          </ul>
          <p>您也可以随时通过隐私设置中的"注销账号"功能删除您的账号。</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">八、条款修改</h2>
          <p>我们保留随时修改本服务条款的权利。修改后的条款将在本页面发布。继续使用本服务即表示您接受修改后的条款。</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">九、适用法律</h2>
          <p>本服务条款受适用法律管辖。因本条款引起的任何争议，应通过友好协商解决；协商不成的，提交有管辖权的法院裁决。</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">十、联系我们</h2>
          <p>如果您对本服务条款有任何疑问，请通过以下方式联系我们：</p>
          <p>电子邮箱：support@fujin.lovable.app</p>
        </section>
      </div>
    </div>
  );
}

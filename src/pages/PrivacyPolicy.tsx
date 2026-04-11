import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">隐私政策</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6 text-sm text-foreground/90 leading-relaxed pb-24">
        <p className="text-muted-foreground">最后更新日期：2026年4月11日</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">一、我们收集的信息</h2>
          <p>为了向您提供服务，我们可能收集以下信息：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>账号信息</strong>：您的电子邮箱、用户名、头像等注册信息。</li>
            <li><strong>位置数据</strong>：在您授权后，我们会获取您的地理位置，用于展示附近的服务和信息。</li>
            <li><strong>设备信息</strong>：设备标识符（Device ID）、操作系统版本、浏览器类型。</li>
            <li><strong>通讯内容</strong>：您在平台上发送的聊天消息（用于提供即时通讯服务）。</li>
            <li><strong>发布内容</strong>：您发布的帖子、图片及相关联系方式。</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">二、信息用途</h2>
          <p>我们使用收集的信息用于：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>提供、维护和改进我们的服务。</li>
            <li>根据您的位置展示附近的服务提供者和商家信息。</li>
            <li>实现用户间的即时通讯和通话功能。</li>
            <li>保障平台安全，防止欺诈和滥用行为。</li>
            <li>发送必要的服务通知。</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">三、信息共享与披露</h2>
          <p>我们不会出售您的个人信息。在以下情况下，我们可能共享您的信息：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>经您同意或应您的要求。</li>
            <li>与为我们提供服务的第三方合作伙伴（如云存储、地图服务）共享必要信息。</li>
            <li>为遵守法律法规、法律程序或政府要求。</li>
            <li>为保护我们的权利、隐私、安全或财产。</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">四、数据存储与安全</h2>
          <p>我们采取合理的技术和管理措施来保护您的个人信息，包括数据加密、访问控制和安全审计。您的数据存储在安全的云服务器上。</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">五、用户权利</h2>
          <p>您享有以下权利：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>访问权</strong>：您可以在个人中心查看您的个人信息。</li>
            <li><strong>修改权</strong>：您可以随时修改您的个人资料。</li>
            <li><strong>删除权</strong>：您可以在隐私设置中注销账号，我们将删除您的相关数据。</li>
            <li><strong>撤回同意</strong>：您可以随时关闭位置共享等权限。</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">六、Cookie 与本地存储</h2>
          <p>我们使用本地存储（localStorage）来保存您的登录状态和偏好设置。这些数据仅存储在您的设备上。</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">七、儿童隐私</h2>
          <p>我们的服务不面向13岁以下的儿童。我们不会故意收集13岁以下儿童的个人信息。如果我们发现已收集此类信息，将会尽快删除。</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">八、隐私政策更新</h2>
          <p>我们可能会不时更新本隐私政策。更新后的政策将在本页面发布，重大变更时我们会通过应用内通知告知您。</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">九、联系我们</h2>
          <p>如果您对本隐私政策有任何疑问，请通过以下方式联系我们：</p>
          <p>电子邮箱：support@fujin.lovable.app</p>
        </section>
      </div>
    </div>
  );
}

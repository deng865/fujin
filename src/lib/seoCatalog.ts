export const SITE_URL = "https://huaren168.online";
export const SITE_TITLE = "华人街坊 | Chinese Local Services & Classifieds in the USA";
export const SITE_DESCRIPTION = "Discover Chinese local services, jobs, rentals, secondhand goods and community connections across US cities. 华人街坊：美国华人本地生活、同城社交、商家服务与分类信息。";

export const SEO_CITIES = [
  { slug: "los-angeles", en: "Los Angeles", zh: "洛杉矶", state: "California", lat: 34.0522, lng: -118.2437, guide: "Los Angeles searches often cover a wide area. Compare the service area and travel arrangements before choosing a provider, and distinguish a rental's neighborhood from the city named in its listing.", chinese: "在洛杉矶寻找服务时，先确认服务覆盖区域和出行安排；租房时区分房源所在社区与帖子标注的城市，不要仅凭城市名称决定。" },
  { slug: "new-york", en: "New York", zh: "纽约", state: "New York", lat: 40.7128, lng: -74.006, guide: "For New York listings, confirm the borough and whether the meeting or service location is convenient for your journey. Ask rental advertisers about lease terms, shared spaces and building access before arranging a viewing.", chinese: "寻找纽约信息时，先确认所在行政区和往返是否方便；看房前询问租约、共用空间和楼宇出入安排，不在公开页面留下个人住址。" },
  { slug: "san-francisco", en: "San Francisco", zh: "旧金山", state: "California", lat: 37.7749, lng: -122.4194, guide: "A Bay Area listing may not be inside San Francisco itself. Confirm the actual service area, pickup arrangements and whether a housing listing is for a private room or an entire unit before making plans.", chinese: "湾区信息不一定位于旧金山市内。联系前确认实际服务区域、取货安排，以及租房是单间还是整套，避免把湾区与城市范围混淆。" },
  { slug: "houston", en: "Houston", zh: "休斯顿", state: "Texas", lat: 29.7604, lng: -95.3698, guide: "When comparing Houston services, ask whether a provider visits your area or works from a fixed business location. For local purchases, agree on a pickup location and inspect the item before completing the exchange.", chinese: "比较休斯顿服务时，先问清是上门服务还是固定门店，是否覆盖你的区域；同城交易先约定取货地点，验货后再完成交易。" },
  { slug: "seattle", en: "Seattle", zh: "西雅图", state: "Washington", lat: 47.6062, lng: -122.3321, guide: "Seattle-area searches can include nearby communities outside the city. Confirm the city and appointment location, and ask employers whether a role is on-site, hybrid or remote rather than assuming a local listing means a short commute.", chinese: "西雅图周边信息可能来自邻近城市。确认具体城市和预约地点；招聘信息要问清现场、混合或远程工作安排，不把同城标签当作通勤承诺。" },
  { slug: "chicago", en: "Chicago", zh: "芝加哥", state: "Illinois", lat: 41.8781, lng: -87.6298, guide: "For Chicago local listings, distinguish city locations from suburban service areas. Confirm appointment times and transport options, and check whether a rental includes utilities or has separate monthly charges.", chinese: "查找芝加哥信息时，区分市内与郊区服务范围，确认预约时间和交通安排；租房时问清水电等费用是否包含在租金里。" },
  { slug: "dallas", en: "Dallas", zh: "达拉斯", state: "Texas", lat: 32.7767, lng: -96.797, guide: "Dallas–Fort Worth listings may serve several different cities. Confirm which location a provider serves, ask about travel charges for home visits, and check the work location before responding to a DFW job advertisement.", chinese: "达拉斯—沃思堡信息可能覆盖多个城市。确认服务地点，上门服务先问出行费用；回应 DFW 招聘前核实实际工作地点。" },
  { slug: "san-diego", en: "San Diego", zh: "圣地亚哥", state: "California", lat: 32.7157, lng: -117.1611, guide: "For San Diego local services, agree on the appointment location and whether the provider covers your neighborhood. When comparing rentals, ask about lease duration, parking arrangements and any recurring charges before paying a deposit.", chinese: "在圣地亚哥预约服务前，确认地点和服务范围；比较租房时核实租期、停车安排和持续费用，再决定是否支付押金。" },
] as const;

export const SEO_CATEGORIES = [
  { slug: "jobs", zh: "华人招聘", en: "Chinese Jobs", keys: ["jobs", "casual worker"], intro: "Find opportunities where Chinese-language skills and local community connections may be useful. Compare the actual work location, responsibilities, schedule and compensation directly with the advertiser.", chinese: "寻找面向华人社区的工作机会，直接向招聘方核实工作地点、职责、时间和薪酬，平台不代替雇主确认招聘条件。", sections: [
    ["Before applying", "Ask for the employer's name, role requirements and how to apply. Never pay an application fee or send identity documents to an unverified contact.", "申请前", "核实雇主名称、岗位要求和申请方式；不要向未经核实的联系人支付应聘费或发送身份证件。"],
    ["Compare the offer", "Clarify whether pay is hourly or salaried, which hours are expected and whether the role is temporary or ongoing. Verify relevant work eligibility requirements with the employer.", "比较岗位", "确认时薪或固定薪资、工作时段、临时或长期安排；向雇主核实岗位适用的工作资格要求。"],
  ] },
  { slug: "rentals", zh: "华人租房", en: "Chinese Rentals", keys: ["housing", "rent"], intro: "Explore housing questions and connect with local rental advertisers. A useful comparison includes the type of space, lease duration, total monthly cost and whether shared areas fit your needs.", chinese: "了解本地租房信息，与发布者确认房型、租期、每月总费用和共用空间是否符合需要。", sections: [
    ["Check the space", "Ask whether the listing is a room, shared home or entire unit. Request a viewing and confirm who is authorized to rent the property before sending money.", "核实房源", "问清单间、合租或整套，安排看房，并确认对方有权出租后再付款。"],
    ["Understand the agreement", "Read the lease, deposit terms, utility arrangements and move-out conditions. Keep a copy of agreed terms and avoid posting your home address publicly.", "了解租约", "阅读租约、押金、水电安排和退租条款，保存约定，不在公开页面发布私人住址。"],
  ] },
  { slug: "secondhand", zh: "二手交易", en: "Secondhand Marketplace", keys: ["secondhand", "second-hand goods", "marketplace", "used", "auto"], intro: "Buy and sell locally while keeping the condition, asking price and pickup arrangements clear. Inspect goods and confirm what is included before agreeing to an exchange.", chinese: "同城买卖二手物品，先核实成色、报价、附件和取货方式，验货后再决定交易。", sections: [
    ["Inspect before buying", "Ask about defects, model details and whether photos show the actual item. For electronics, test basic functions and confirm the item is not locked to another account.", "购买前验货", "询问缺陷、型号和实物照片；电子产品测试基本功能，确认没有被其他账户锁定。"],
    ["Arrange a safe exchange", "Choose a suitable public meeting place, avoid sharing your home address unnecessarily and be cautious about requests for deposits before inspection.", "安全交易", "选择合适的公共地点，不随意透露住址，谨慎对待验货前要求支付订金的请求。"],
  ] },
  { slug: "community", zh: "同城交友", en: "Chinese Community Connections", keys: ["social", "social contact", "community", "friends"], intro: "Build local connections around shared interests and community activities. Keep first conversations on the platform and decide for yourself what personal information to share.", chinese: "围绕共同兴趣和社区活动认识同城朋友，初次交流留在平台内，自主决定分享哪些个人信息。", sections: [
    ["Meet thoughtfully", "Discuss the activity and meeting expectations first. For an initial meeting, choose a public place and tell someone you trust about your plans.", "谨慎见面", "先确认活动和见面安排，第一次选择公共场所，并让信任的人知道计划。"],
    ["Protect personal details", "Do not post precise live location, identity documents or private contact information. Report suspicious requests or unwanted behavior using the site's reporting tools.", "保护个人资料", "不要公开实时精确位置、证件或私人联系方式，遇到可疑要求或骚扰可使用举报功能。"],
  ] },
  { slug: "businesses", zh: "华人商家", en: "Chinese Businesses", keys: ["food", "beauty", "massage", "nails", "hair", "restaurant", "shopping"], intro: "Discover businesses and services for Chinese-speaking customers. Compare what a business offers, its current availability and the terms of the service rather than relying on a category label alone.", chinese: "寻找面向华语顾客的商家，比较服务内容、当前营业安排和服务条款，不只依据分类标签做选择。", sections: [
    ["Plan your visit", "Confirm business hours, appointment requirements and the public business location before traveling. Ask about language support if it matters for your visit.", "到店前确认", "出发前核实营业时间、是否预约和公开门店地点；如有需要，询问是否提供中文服务。"],
    ["Compare clearly", "Ask what a quoted price includes and whether extra charges apply. Public listings are advertisements, not a guarantee of quality or licensing.", "明确比较", "询问报价包含哪些内容、有无额外费用；公开帖子属于广告信息，不等于质量或资质保证。"],
  ] },
  { slug: "services", zh: "生活服务", en: "Chinese Local Services", keys: ["legal", "law and accounting", "education", "travel", "driver", "service", "services", "on-site service", "home services", "medical services", "repair", "cleaning"], intro: "Find help with everyday needs, from appointments and transport to home services. Explain the task, agree on scope and confirm the provider's availability before committing.", chinese: "寻找接送、预约、家居等日常服务，说明需求，确认服务范围和时间后再作决定。", sections: [
    ["Agree on the scope", "Clarify what work is included, whether a visit is needed and how changes will be handled. Confirm the agreed fare or quote directly; estimates are not final prices.", "约定服务范围", "确认包含的工作、是否上门和变更处理方式；直接确认约定车费或报价，估价不等于最终价格。"],
    ["Verify specialist services", "Where a profession requires a license, check the provider's credentials with the relevant official authority. Do not treat a directory listing as legal, medical or financial advice.", "核实专业服务", "需要执照的专业服务，应向相应官方机构核实资质；目录信息不是法律、医疗或财务建议。"],
  ] },
] as const;

export function canonicalUrl(path: string) {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return `${SITE_URL}${clean}`;
}

export const PUBLIC_PATHS = ["/", "/cities", "/categories", ...SEO_CITIES.map(c => `/cities/${c.slug}`), ...SEO_CATEGORIES.map(c => `/categories/${c.slug}`), "/privacy-policy", "/terms-of-service"];

export function routeSeo(path: string) {
  const city = SEO_CITIES.find(c => path === `/cities/${c.slug}`);
  if (city) return { title: `${city.en} Chinese Community & Services | ${city.zh}华人生活 · 华人街坊`, description: `Find Chinese local services and community information in ${city.en}, ${city.state}. ${city.zh}华人招聘、租房、二手交易、商家与生活服务指南。`, noindex: false };
  const category = SEO_CATEGORIES.find(c => path === `/categories/${c.slug}`);
  if (category) return { title: `${category.en} in the USA | ${category.zh} · 华人街坊`, description: `${category.intro.slice(0, 130)} ${category.zh}：美国华人本地分类信息。`, noindex: false };
  const routes: Record<string, [string, string]> = {
    "/": [SITE_TITLE, SITE_DESCRIPTION],
    "/cities": ["US Chinese Community by City | 美国城市 · 华人街坊", "Explore Chinese local life in Los Angeles, New York, San Francisco, Houston, Seattle, Chicago, Dallas and San Diego. 美国八大城市华人生活指南。"],
    "/categories": ["Chinese Classifieds & Services | 分类信息 · 华人街坊", "Browse Chinese jobs, rentals, secondhand goods, community connections, businesses and local services in the USA. 美国华人分类信息与服务指南。"],
    "/privacy-policy": ["Privacy Policy | 隐私政策 · 华人街坊", "Read how 华人街坊 handles personal information, location permissions, messages and account privacy. 了解个人资料、位置权限与账户隐私。"],
    "/terms-of-service": ["Terms of Service | 服务条款 · 华人街坊", "Review the terms for using 华人街坊, posting local information and connecting with the Chinese community. 阅读平台服务条款与用户责任。"],
    "/pricing": ["发布套餐与价格 | 华人街坊", "查看当前发布套餐、优惠与可购买的发布权益。价格和权益以购买页面显示为准。"],
    "/auth": ["登录与注册 | 华人街坊", "登录或注册华人街坊账户。"],
    "/reset-password": ["重设密码 | 华人街坊", "安全重设华人街坊账户密码。"],
    "/profile": ["我的账户 | 华人街坊", "管理个人账户、发布与隐私设置。"],
    "/favorites": ["我的收藏 | 华人街坊", "查看账户收藏的信息。"],
    "/messages": ["我的消息 | 华人街坊", "查看私人会话与消息。"],
    "/orders": ["我的订单 | 华人街坊", "查看账户购买记录。"],
    "/checkout/return": ["付款结果 | 华人街坊", "查看本次付款确认结果。"],
    "/create-post": ["发布或编辑信息 | 华人街坊", "发布或编辑本地生活信息。"],
    "/admin": ["管理中心 | 华人街坊", "授权管理员工作区域。"],
    "/admin-portal": ["管理后台 | 华人街坊", "授权管理员工作区域。"],
  };
  const entry = routes[path];
  return { title: entry?.[0] || (path.startsWith("/post/") ? "信息详情 | 华人街坊" : path.startsWith("/chat/") ? "私人会话 | 华人街坊" : "页面不存在 | 华人街坊"), description: entry?.[1] || "华人街坊本地生活平台。", noindex: !PUBLIC_PATHS.includes(path) };
}

export function directorySchema(path: string, title: string) {
  return { "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", "@id": canonicalUrl(path), url: canonicalUrl(path), name: title, inLanguage: ["en", "zh-CN"], isPartOf: { "@id": `${SITE_URL}/#website` } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "华人街坊", item: `${SITE_URL}/` }, { "@type": "ListItem", position: 2, name: title, item: canonicalUrl(path) }] },
  ] };
}
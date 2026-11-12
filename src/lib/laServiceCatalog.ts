export const LA_CITY = {
  slug: "los-angeles",
  en: "Los Angeles",
  zh: "洛杉矶",
  state: "California",
  lat: 34.0522,
  lng: -118.2437,
  latPadding: 0.5,
  lngPadding: 0.65,
} as const;

export type LaServiceSection = {
  enHeading: string;
  en: string;
  zhHeading: string;
  zh: string;
};

export type LaService = {
  slug: string;
  en: string;
  zh: string;
  keys: readonly string[];
  categorySlug: "jobs" | "rentals" | "businesses" | "services";
  title: string;
  description: string;
  intro: string;
  chinese: string;
  sections: readonly LaServiceSection[];
};

export const LA_SERVICES: readonly LaService[] = [
  {
    slug: "jobs",
    en: "Chinese Jobs",
    zh: "华人招聘",
    keys: ["jobs", "casual worker"],
    categorySlug: "jobs",
    title: "Los Angeles Chinese Jobs & Hiring | 洛杉矶华人招聘 · 华人街坊",
    description: "Explore real public Chinese job posts in Los Angeles and compare work location, schedule and pay. 洛杉矶华人招聘、兼职与本地工作信息，直接核实岗位要求。",
    intro: "Look for work across Los Angeles with a clear view of the actual worksite, schedule and application process. A listing may serve a different neighborhood or nearby city, so confirm the commute rather than relying on a broad Los Angeles label.",
    chinese: "查找洛杉矶及周边公开工作信息时，先确认实际工作地点、班次、薪酬和申请方式。帖子中的“洛杉矶”可能涵盖不同社区或邻近城市，不要把城市标签当作通勤承诺。",
    sections: [
      {
        enHeading: "Compare the real work arrangement",
        en: "Ask whether the role is in Los Angeles proper, the San Gabriel Valley or another nearby community. Confirm hourly or fixed pay, expected hours, job duties and whether the position is temporary or ongoing before sharing application materials.",
        zhHeading: "核实实际工作安排",
        zh: "问清岗位位于洛杉矶市内、圣盖博谷还是其他周边城市，并确认时薪或固定薪资、工作时间、职责及临时或长期性质，再发送申请资料。",
      },
      {
        enHeading: "Apply without paying for access",
        en: "Use the public post to start a conversation, then verify the employer and worksite. Do not pay an application fee or send identity documents to an unverified contact; confirm any work eligibility requirements directly with the employer.",
        zhHeading: "安全申请，不付费买岗位",
        zh: "可通过公开帖子联系发布者，并核实雇主和工作地点。不要向未经核实的联系人支付应聘费或发送身份证件；工作资格要求请直接向雇主确认。",
      },
    ],
  },
  {
    slug: "rentals",
    en: "Chinese Rentals",
    zh: "华人租房",
    keys: ["housing", "rent"],
    categorySlug: "rentals",
    title: "Los Angeles Chinese Rentals & Housing | 洛杉矶华人租房 · 华人街坊",
    description: "Browse genuine public rental posts around Los Angeles and compare room type, lease and total cost. 洛杉矶华人租房、合租与房源信息，先看房核实再付款。",
    intro: "Compare rental advertisements across Los Angeles by the type of space, lease length and full monthly cost. The city name alone does not establish the neighborhood, so ask for the general area and arrange a legitimate viewing before making commitments.",
    chinese: "比较洛杉矶公开房源时，重点核实房型、租期和每月全部费用。城市名称不能代替所在社区，先了解大致区域并正常看房，不要仅凭帖子付款或签约。",
    sections: [
      {
        enHeading: "Understand the space and location",
        en: "Clarify whether the offer is a private room, shared home or entire unit, and whether it is in Los Angeles or a nearby community. Use navigation only after deciding to visit; this directory does not publish a resident's precise coordinates or private address.",
        zhHeading: "弄清房型与大致区域",
        zh: "确认是独立房间、合租还是整套，以及位于洛杉矶市内还是周边城市。决定看房后再使用导航；本目录不公开住户精确坐标或私人住址。",
      },
      {
        enHeading: "Review costs before paying",
        en: "Read the lease and confirm deposit, utilities, parking, notice and move-out terms. Verify who is authorized to rent the property, keep written records and avoid sending a deposit before a viewing and verification.",
        zhHeading: "付款前核对全部费用",
        zh: "阅读租约，确认押金、水电、停车、通知和退租条款。核实对方是否有权出租，保存书面约定；未看房和核实前不要支付押金。",
      },
    ],
  },
  {
    slug: "lawyers",
    en: "Chinese-Speaking Lawyers",
    zh: "华人律师",
    keys: ["legal", "law and accounting"],
    categorySlug: "services",
    title: "Los Angeles Chinese-Speaking Lawyers | 洛杉矶华人律师 · 华人街坊",
    description: "Find real public legal service posts for Chinese-speaking clients in Los Angeles. 洛杉矶华人律师与法律服务入口，核实加州执照、执业范围和费用。",
    intro: "Find public legal-service advertisements for Chinese-speaking clients in Los Angeles while keeping language preference separate from professional qualifications. Confirm the attorney's California license status, practice area and whether the office or remote consultation covers your situation.",
    chinese: "为洛杉矶华语用户提供公开法律服务信息入口。语言沟通便利不等于专业资质，请分别核实律师加州执照状态、执业领域，以及面谈或远程咨询是否适合你的事项。",
    sections: [
      {
        enHeading: "Verify the attorney and the engagement",
        en: "Check the attorney's name and license with the State Bar of California. Ask who will handle the matter, which court or jurisdiction is involved and whether the first discussion is a consultation or establishes representation.",
        zhHeading: "核实律师与委托关系",
        zh: "通过加州律师协会核对律师姓名和执照状态，询问实际承办人、相关法院或司法辖区，并确认首次沟通是一般咨询还是正式建立委托关系。",
      },
      {
        enHeading: "Agree on scope and fees",
        en: "Request a written explanation of the services, fee structure, filing or third-party costs and communication arrangements. A directory entry is an advertisement, not legal advice or a promise of an outcome; avoid posting sensitive case details publicly.",
        zhHeading: "书面确认范围与费用",
        zh: "要求书面说明服务内容、收费方式、诉讼或第三方费用及沟通安排。目录帖子属于广告，不构成法律意见或结果保证；不要在公开页面披露敏感案情。",
      },
    ],
  },
  {
    slug: "restaurants",
    en: "Chinese Restaurants",
    zh: "中餐馆与美食",
    keys: ["food", "restaurant"],
    categorySlug: "businesses",
    title: "Los Angeles Chinese Restaurants & Food | 洛杉矶中餐美食 · 华人街坊",
    description: "Discover real public Chinese restaurant and food posts around Los Angeles. 洛杉矶中餐馆、外卖与美食信息，确认门店位置、营业时间和菜单。",
    intro: "Explore public Chinese food and restaurant posts across Los Angeles and nearby communities. Confirm the current business location, opening hours and ordering method before traveling, especially where a business serves more than one neighborhood.",
    chinese: "浏览洛杉矶及周边公开中餐和美食信息。出发前确认当前门店位置、营业时间和点餐方式；如果商家覆盖多个社区，更要先核实实际服务安排。",
    sections: [
      {
        enHeading: "Plan the visit or order",
        en: "Check whether the post concerns dine-in, takeout, delivery or a food business without a public counter. Confirm hours, appointment or preorder requirements and the public pickup location rather than assuming every food listing is a restaurant.",
        zhHeading: "确认到店或点餐方式",
        zh: "分清帖子是堂食、外带、配送还是没有公共柜台的美食服务，确认营业时间、预约或预订要求及公开取货地点，不要把所有美食帖子都当作餐馆。",
      },
      {
        enHeading: "Ask about menu details",
        en: "Confirm current dishes, prices, portion arrangements and any dietary or allergen needs directly with the business. Public photos and titles describe the advertiser's offering but do not replace current menu or ingredient confirmation.",
        zhHeading: "直接核实菜单细节",
        zh: "向商家确认当前菜品、价格、份量，以及饮食禁忌或过敏原需求。公开图片和标题用于介绍发布者的服务，不能替代最新菜单和配料确认。",
      },
    ],
  },
  {
    slug: "drivers",
    en: "Chinese Drivers & Rides",
    zh: "华人司机与接送",
    keys: ["driver"],
    categorySlug: "services",
    title: "Los Angeles Chinese Drivers & Rides | 洛杉矶华人司机接送 · 华人街坊",
    description: "Find real available Chinese driver posts in Los Angeles and arrange pickup, luggage and fare. 洛杉矶华人司机、机场接送与同城出行，先在聊天中确认行程。",
    intro: "Connect with publicly available driver services around Los Angeles and agree on the trip before departure. Airport, city and longer-distance journeys have different pickup needs, so confirm the meeting point, passenger count, luggage and fare in chat.",
    chinese: "联系洛杉矶周边当前公开接单的司机，并在出发前约定行程。机场、市内和长途接送的上车安排不同，请在聊天中确认接人地点、人数、行李和费用。",
    sections: [
      {
        enHeading: "Agree on pickup and fare",
        en: "Use the existing conversation to share the intended pickup and destination and to confirm the agreed fare. Route estimates are advisory and never replace the price both sides accept; live location sharing remains a separate, user-controlled choice.",
        zhHeading: "约定接人地点与费用",
        zh: "在现有聊天中发送上车点和目的地，并确认双方接受的费用。路线估价仅供参考，不会覆盖约定价格；实时位置共享始终由用户独立控制。",
      },
      {
        enHeading: "Keep the trip in the active chat",
        en: "For an active booking, use the trip interface inside the passenger–driver conversation for arrival and completion steps. Public directory pages do not expose a driver's live GPS trail or turn the service catalog into a tracking map.",
        zhHeading: "在行程聊天内完成服务",
        zh: "正式预约后，在乘客与司机的对话中使用接人、送达和结束行程功能。公开目录不会显示司机实时 GPS 轨迹，也不会把服务列表变成跟踪地图。",
      },
    ],
  },
  {
    slug: "beauty",
    en: "Chinese Beauty Services",
    zh: "华人美容美发美甲",
    keys: ["beauty", "nails", "hair", "massage"],
    categorySlug: "businesses",
    title: "Los Angeles Chinese Beauty, Hair & Nails | 洛杉矶美容美甲 · 华人街坊",
    description: "Browse real public Chinese beauty, hair, nail and massage posts in Los Angeles. 洛杉矶华人美容、美发、美甲服务，预约前确认项目、价格与资质。",
    intro: "Find public beauty, hair, nail and massage service posts for Chinese-speaking customers around Los Angeles. Confirm whether the provider works at a salon, another fixed location or offers a mobile visit before choosing a time.",
    chinese: "查找洛杉矶及周边面向华语顾客的美容、美发、美甲和按摩公开信息。预约前确认服务者在门店、其他固定地点工作，还是提供上门服务。",
    sections: [
      {
        enHeading: "Confirm the appointment and service",
        en: "Ask what the booked service includes, how long it takes, the total price and cancellation terms. Discuss allergies, sensitivities or aftercare questions directly; do not rely on a category label or photograph as a health assessment.",
        zhHeading: "确认预约与具体项目",
        zh: "询问项目包含内容、所需时间、总价和取消规则。过敏、敏感或护理问题请直接沟通；分类标签和照片不能代替专业评估。",
      },
      {
        enHeading: "Check professional requirements",
        en: "Where California requires a license for a service, verify the provider or establishment with the appropriate state authority. For mobile appointments, agree on a suitable service location without publishing a home address in the public directory.",
        zhHeading: "核实适用的专业要求",
        zh: "加州要求执照的服务，应向相应州主管机构核实服务者或门店资质。预约上门服务时，双方另行约定合适地点，不要在公开目录公布家庭住址。",
      },
    ],
  },
] as const;

export const MIN_LA_LISTINGS_FOR_INDEX = 1;

export function getLaService(slug?: string) {
  return LA_SERVICES.find(service => service.slug === slug);
}

export function laServicePath(service: LaService) {
  return `/cities/${LA_CITY.slug}/${service.slug}`;
}

export function isLaServiceIndexable(status: "loading" | "ready" | "error", listingCount: number) {
  return status === "ready" && listingCount >= MIN_LA_LISTINGS_FOR_INDEX;
}

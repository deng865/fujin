import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DollarSign, Phone, MessageCircle, Clock } from "lucide-react";
import MediaUpload from "./MediaUpload";

function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/Chicago";
  }
}

interface FormData {
  title: string;
  description: string;
  price: string;
  phone: string;
  wechatId: string;
  imageUrls: string[];
  // Housing specific
  bedrooms: string;
  bathrooms: string;
  priceUnit: string;
  // Driver specific
  carModel: string;
  vehicleColor: string;
  licensePlate: string;
  availableTime: string;
  driverPriceUnit: string;
  // Jobs specific
  salaryRange: string;
  jobType: string;
  // Operating hours (fixed merchants)
  openTime: string;
  closeTime: string;
  timezone: string;
}

interface DynamicFormProps {
  category: string;
  data: FormData;
  onChange: (data: Partial<FormData>) => void;
  isMobile?: boolean;
}

export default function DynamicForm({ category, data, onChange, isMobile = false }: DynamicFormProps) {
  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-muted-foreground">标题 / Title *</Label>
        <Input
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={getCategoryPlaceholder(category)}
          className="rounded-xl h-11"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-muted-foreground">详细描述 / Description</Label>
        <Textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="详细描述您的信息..."
          rows={3}
          className="rounded-xl resize-none"
        />
      </div>

      {/* Dynamic Fields by Category */}
      {category === "housing" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">户型 Bed</Label>
              <select
                value={data.bedrooms}
                onChange={(e) => onChange({ bedrooms: e.target.value })}
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="">选择</option>
                {["Studio", "1B", "2B", "3B", "4B+"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">卫浴 Bath</Label>
              <select
                value={data.bathrooms}
                onChange={(e) => onChange({ bathrooms: e.target.value })}
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="">选择</option>
                {["1B", "2B", "3B+"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">租金 Rent</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={data.price}
                  onChange={(e) => onChange({ price: e.target.value })}
                  type="number"
                  placeholder="金额"
                  className="pl-9 rounded-xl h-11"
                />
              </div>
              <select
                value={data.priceUnit}
                onChange={(e) => onChange({ priceUnit: e.target.value })}
                className="w-24 h-11 rounded-xl border border-border bg-background px-2 text-sm"
              >
                <option value="month">月租</option>
                <option value="week">周租</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {category === "driver" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">车型 Vehicle</Label>
            <Input
              value={data.carModel}
              onChange={(e) => onChange({ carModel: e.target.value })}
              placeholder="如：Toyota Camry 2023"
              className="rounded-xl h-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">车色 Color</Label>
              <Input
                value={data.vehicleColor}
                onChange={(e) => onChange({ vehicleColor: e.target.value })}
                placeholder="如：白色 / White"
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">车牌 Plate</Label>
              <Input
                value={data.licensePlate}
                onChange={(e) => onChange({ licensePlate: e.target.value })}
                placeholder="如：ABC-1234"
                className="rounded-xl h-11"
              />
            </div>
          </div>
        </div>
      )}

      {category === "jobs" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">薪资范围</Label>
              <Input
                value={data.salaryRange}
                onChange={(e) => onChange({ salaryRange: e.target.value })}
                placeholder="如：$15-20/hr"
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">工作类型</Label>
              <select
                value={data.jobType}
                onChange={(e) => onChange({ jobType: e.target.value })}
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="">选择</option>
                <option value="fulltime">全职</option>
                <option value="parttime">兼职</option>
                <option value="contract">合同</option>
              </select>
            </div>
          </div>
          <PriceField value={data.price} onChange={(v) => onChange({ price: v })} />
        </div>
      )}

      {/* Generic price for other categories */}
      {!["housing", "driver", "jobs"].includes(category) && category && (
        <PriceField value={data.price} onChange={(v) => onChange({ price: v })} />
      )}

      {/* Media Upload - below price fields */}
      <MediaUpload
        mediaUrls={data.imageUrls}
        onChange={(urls) => onChange({ imageUrls: urls })}
      />

      {/* Contact info - always shown */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">电话 Phone</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={data.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="可选"
              className="pl-9 rounded-xl h-11"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">微信 WeChat</Label>
          <div className="relative">
            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={data.wechatId}
              onChange={(e) => onChange({ wechatId: e.target.value })}
              placeholder="可选"
              className="pl-9 rounded-xl h-11"
            />
          </div>
        </div>
      </div>

      {/* Operating hours - only for fixed merchants */}
      {!isMobile && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            营业时间 / Operating Hours
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">开门</Label>
              <Input
                type="time"
                value={data.openTime}
                onChange={(e) => onChange({ openTime: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">关门</Label>
              <Input
                type="time"
                value={data.closeTime}
                onChange={(e) => onChange({ closeTime: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">设置后，非营业时间将在地图上隐藏</p>
        </div>
      )}
    </div>
  );
}

function PriceField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">价格 Price (USD)</Label>
      <div className="relative">
        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type="number"
          placeholder="可选 / Optional"
          className="pl-9 rounded-xl h-11"
        />
      </div>
    </div>
  );
}

function getCategoryPlaceholder(cat: string) {
  switch (cat) {
    case "housing": return "如：两室一厅公寓出租 / 2BR apt for rent";
    case "jobs": return "如：中餐馆招服务员 / Restaurant hiring";
    case "driver": return "如：DFW接送机 / Airport pickup";
    case "food": return "如：正宗川菜外卖 / Sichuan food delivery";
    case "auto": return "如：2020 Toyota Camry 出售";
    default: return "输入标题...";
  }
}

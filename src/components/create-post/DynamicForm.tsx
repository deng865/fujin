import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DollarSign, Phone, MessageCircle } from "lucide-react";
import MediaUpload from "./MediaUpload";

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
  availableTime: string;
  driverPriceUnit: string;
  // Jobs specific
  salaryRange: string;
  jobType: string;
}

interface DynamicFormProps {
  category: string;
  data: FormData;
  onChange: (data: Partial<FormData>) => void;
}

export default function DynamicForm({ category, data, onChange }: DynamicFormProps) {
  const handleImageAdd = () => {
    const url = prompt("输入图片链接 / Enter image URL");
    if (url?.trim()) {
      onChange({ imageUrls: [...data.imageUrls, url.trim()] });
    }
  };

  const removeImage = (index: number) => {
    onChange({ imageUrls: data.imageUrls.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-5">
      {/* Image Upload Area */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-muted-foreground">图片 / Photos</Label>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {data.imageUrls.map((url, i) => (
            <div key={i} className="relative shrink-0">
              <img src={url} alt="" className="h-20 w-20 object-cover rounded-xl border-2 border-border/50" />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            onClick={handleImageAdd}
            className="h-20 w-20 shrink-0 rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            <Camera className="h-5 w-5" />
            <span className="text-[10px]">添加</span>
          </button>
        </div>
      </div>

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
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">可接单时间</Label>
            <Input
              value={data.availableTime}
              onChange={(e) => onChange({ availableTime: e.target.value })}
              placeholder="如：周一至周五 9am-5pm"
              className="rounded-xl h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">价格 Price</Label>
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
                value={data.driverPriceUnit}
                onChange={(e) => onChange({ driverPriceUnit: e.target.value })}
                className="w-24 h-11 rounded-xl border border-border bg-background px-2 text-sm"
              >
                <option value="trip">按次</option>
                <option value="hour">按时</option>
              </select>
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

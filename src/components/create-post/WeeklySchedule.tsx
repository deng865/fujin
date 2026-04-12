import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DaySchedule {
  day: number;
  open: string;
  close: string;
  closed: boolean;
}

const DAY_LABELS = ["周一 Mon", "周二 Tue", "周三 Wed", "周四 Thu", "周五 Fri", "周六 Sat", "周日 Sun"];

interface WeeklyScheduleProps {
  is24Hours: boolean;
  schedule: DaySchedule[];
  onToggle24h: (v: boolean) => void;
  onScheduleChange: (schedule: DaySchedule[]) => void;
}

export default function WeeklySchedule({ is24Hours, schedule, onToggle24h, onScheduleChange }: WeeklyScheduleProps) {
  const updateDay = (dayIndex: number, patch: Partial<DaySchedule>) => {
    const next = schedule.map((d) => (d.day === dayIndex ? { ...d, ...patch } : d));
    onScheduleChange(next);
  };

  const applyToWeekdays = () => {
    const mon = schedule.find((d) => d.day === 0);
    if (!mon) return;
    const next = schedule.map((d) =>
      d.day >= 0 && d.day <= 4 ? { ...d, open: mon.open, close: mon.close, closed: mon.closed } : d
    );
    onScheduleChange(next);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        营业时间 / Operating Hours *
      </Label>

      {/* 24h toggle */}
      <div className="flex items-center justify-between bg-accent/30 rounded-xl px-4 py-3">
        <span className="text-sm font-medium">24小时营业</span>
        <Switch checked={is24Hours} onCheckedChange={onToggle24h} />
      </div>

      {!is24Hours && (
        <div className="space-y-2">
          {/* Apply to weekdays button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5"
            onClick={applyToWeekdays}
          >
            <Copy className="h-3 w-3" />
            将周一时间应用到周一至周五
          </Button>

          {schedule.map((day) => (
            <div
              key={day.day}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                day.closed ? "bg-muted/50 opacity-60" : "bg-background"
              }`}
            >
              <span className="text-xs font-medium w-16 shrink-0">{DAY_LABELS[day.day]}</span>

              <Input
                type="time"
                value={day.open}
                onChange={(e) => updateDay(day.day, { open: e.target.value })}
                disabled={day.closed}
                className="h-9 rounded-lg text-xs flex-1 min-w-0"
              />
              <span className="text-muted-foreground text-xs">-</span>
              <Input
                type="time"
                value={day.close}
                onChange={(e) => updateDay(day.day, { close: e.target.value })}
                disabled={day.closed}
                className="h-9 rounded-lg text-xs flex-1 min-w-0"
              />

              <div className="flex items-center gap-1 shrink-0">
                <Checkbox
                  checked={day.closed}
                  onCheckedChange={(v) => updateDay(day.day, { closed: !!v })}
                  id={`closed-${day.day}`}
                />
                <label htmlFor={`closed-${day.day}`} className="text-[10px] text-muted-foreground cursor-pointer">
                  休
                </label>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">勾选"休"标记休息日，非营业时间将在地图上隐藏</p>
        </div>
      )}
    </div>
  );
}

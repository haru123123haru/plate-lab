"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/components/locale-provider";
import { addDays } from "@/lib/notifications";
import {
  DEFAULT_REMINDER_DAYS,
  MAX_REMINDER_DAYS,
  reminderDaysSchema,
} from "@/lib/validations";
import { cn } from "@/lib/utils";

// 入力途中の値。日数は打ちかけでも持てるよう文字列で持つ
export interface ReminderDraft {
  enabled: boolean;
  days: string;
}

export function toReminderDraft(reminderDays: number | null): ReminderDraft {
  return reminderDays === null
    ? { enabled: false, days: String(DEFAULT_REMINDER_DAYS) }
    : { enabled: true, days: String(reminderDays) };
}

// 保存する値。知らせないなら null、日数が正しくなければ undefined
export function parseReminderDraft(
  draft: ReminderDraft
): number | null | undefined {
  if (!draft.enabled) return null;
  if (!/^\d+$/.test(draft.days.trim())) return undefined;
  const parsed = reminderDaysSchema.safeParse(Number(draft.days.trim()));
  return parsed.success ? parsed.data : undefined;
}

// 仕込み日（YYYY-MM-DD）から days 日後の日付
function reminderDate(setupDate: string, days: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(setupDate)) return null;
  return addDays(new Date(`${setupDate}T00:00:00Z`), days)
    .toISOString()
    .slice(0, 10);
}

// プレートの作成と編集で使う「観察のリマインド」の欄
export function ReminderDaysField({
  id,
  value,
  onChange,
  setupDate,
  inputClassName,
}: {
  id: string;
  value: ReminderDraft;
  onChange: (value: ReminderDraft) => void;
  setupDate: string;
  inputClassName?: string;
}) {
  const { t } = useTranslation();
  const days = parseReminderDraft(value);
  const date = typeof days === "number" ? reminderDate(setupDate, days) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={`${id}-switch`}
          className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium"
        >
          {t("observationReminder")}
        </label>
        <Switch
          id={`${id}-switch`}
          checked={value.enabled}
          onCheckedChange={(enabled) => onChange({ ...value, enabled })}
          aria-label={t("reminderNotify")}
        />
      </div>

      {value.enabled ? (
        <div className="flex flex-wrap items-center gap-2 text-[15px] text-text-primary">
          <label htmlFor={`${id}-days`}>{t("reminderDayPrefix")}</label>
          <Input
            id={`${id}-days`}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_REMINDER_DAYS}
            value={value.days}
            onChange={(e) => onChange({ ...value, days: e.target.value })}
            aria-invalid={days === undefined}
            className={cn(
              "h-12 w-20 rounded-xl border-border-default text-center text-[15px]",
              inputClassName
            )}
          />
          <span>{t("reminderDaySuffix")}</span>
          {date && (
            <span className="text-[13px] text-text-secondary">
              {t("reminderOnDate").replace("{date}", date)}
            </span>
          )}
        </div>
      ) : (
        <p className="text-[15px] text-text-secondary">{t("reminderOff")}</p>
      )}

      {days === undefined && (
        <p className="text-[13px] text-accent-negative">
          {t("reminderInvalid").replace("{max}", String(MAX_REMINDER_DAYS))}
        </p>
      )}
    </div>
  );
}

import {
  CALENDAR_DATE_RE,
  isValidCalendarDate,
} from "./calendar";

export const PLAN_TITLE_MAX_LENGTH = 100;
export const PLAN_DESCRIPTION_MAX_LENGTH = 2000;
export const PLAN_CAPTION_MAX_LENGTH = 200;
export const PLAN_EXPENSE_LABEL_MAX_LENGTH = 100;
export const PLAN_MAX_IMAGES = 100;
export const PLAN_MAX_VIDEOS = 20;
export const PLAN_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const PLAN_DEFAULT_CURRENCY = "EUR";

export const IMAGE_VARIANT_PUBLIC = "public";
export const IMAGE_VARIANT_THUMBNAIL = "thumbnail";

export function isImageDeliveryUrl(url: string): boolean {
  return url.includes("imagedelivery.net");
}

export function pickImageVariantUrl(
  variants: string[] | undefined,
  variantName: string,
): string | null {
  if (!variants || variants.length === 0) return null;
  const suffix = `/${variantName}`;
  const match = variants.find((url) => url.includes(suffix));
  return match ?? null;
}

export function imageUrlWithVariant(
  url: string | null | undefined,
  variantName: string,
): string | null {
  if (!url || !isImageDeliveryUrl(url)) return url ?? null;
  const lastSlash = url.lastIndexOf("/");
  if (lastSlash === -1) return url;
  return `${url.slice(0, lastSlash + 1)}${variantName}`;
}

export function normalizePlanImageMedia<
  T extends {
    type: string;
    thumbnail_url: string | null;
    playback_url: string | null;
  },
>(media: T): T {
  if (media.type !== "image") return media;

  const sourceUrl = media.playback_url ?? media.thumbnail_url;
  if (!sourceUrl || !isImageDeliveryUrl(sourceUrl)) return media;

  return {
    ...media,
    playback_url: imageUrlWithVariant(sourceUrl, IMAGE_VARIANT_PUBLIC),
    thumbnail_url: imageUrlWithVariant(sourceUrl, IMAGE_VARIANT_THUMBNAIL),
  };
}

export function normalizeCoverThumbnailUrl(url: string | null): string | null {
  if (!url || !isImageDeliveryUrl(url)) return url;
  return imageUrlWithVariant(url, IMAGE_VARIANT_THUMBNAIL);
}

export function planMediaMosaicSrc(item: {
  type: string;
  thumbnail_url: string | null;
  playback_url: string | null;
}): string | null {
  if (item.type === "image") {
    return (
      item.thumbnail_url ??
      imageUrlWithVariant(item.playback_url, IMAGE_VARIANT_THUMBNAIL)
    );
  }
  return item.thumbnail_url;
}

export function planMediaFullSrc(item: {
  type: string;
  thumbnail_url: string | null;
  playback_url: string | null;
}): string | null {
  if (item.type === "image") {
    return (
      item.playback_url ??
      imageUrlWithVariant(item.thumbnail_url, IMAGE_VARIANT_PUBLIC)
    );
  }
  return item.playback_url;
}

export const PLAN_EXPENSE_CATEGORIES = [
  "transport",
  "food",
  "lodging",
  "activities",
  "shopping",
  "other",
] as const;

export type PlanExpenseCategory = (typeof PLAN_EXPENSE_CATEGORIES)[number];

export type PlanMediaType = "image" | "video";
export type PlanMediaStatus = "ready" | "processing" | "failed";

export interface PlanDateRange {
  start_date: string | null;
  end_date: string | null;
}

export function normalizePlanTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > PLAN_TITLE_MAX_LENGTH) return null;
  return trimmed;
}

export function normalizePlanDescription(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > PLAN_DESCRIPTION_MAX_LENGTH) return null;
  return trimmed;
}

export function normalizePlanDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !CALENDAR_DATE_RE.test(value)) return null;
  if (!isValidCalendarDate(value)) return null;
  return value;
}

export function normalizePlanCurrency(value: unknown): string | null {
  if (value == null || value === "") return PLAN_DEFAULT_CURRENCY;
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(trimmed)) return null;
  return trimmed;
}

export function normalizeBudgetAmountCents(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const cents = Math.round(value);
  if (cents < 0) return null;
  return cents;
}

export function comparePlanDates(a: string, b: string): number {
  return a.localeCompare(b);
}

export function isValidPlanDateRange(
  startDate: string | null,
  endDate: string | null,
): boolean {
  if (!startDate && !endDate) return true;
  if (startDate && !endDate) return true;
  if (!startDate && endDate) return false;
  if (!startDate || !endDate) return true;
  return comparePlanDates(startDate, endDate) <= 0;
}

export function formatPlanDateRange(
  startDate: string | null,
  endDate: string | null,
): string | null {
  if (!startDate && !endDate) return null;
  if (startDate && (!endDate || startDate === endDate)) {
    const [year, month, day] = startDate.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  if (startDate && endDate) {
    const fmt = (d: string) => {
      const [year, month, day] = d.split("-").map(Number);
      return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    };
    return `${fmt(startDate)} – ${fmt(endDate)}`;
  }
  return null;
}

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function expandPlanToDates(
  startDate: string,
  endDate: string,
  from: string,
  to: string,
): string[] {
  const rangeStart = comparePlanDates(startDate, from) < 0 ? from : startDate;
  const rangeEnd = comparePlanDates(endDate, to) > 0 ? to : endDate;
  if (comparePlanDates(rangeStart, rangeEnd) > 0) return [];

  const dates: string[] = [];
  let current = rangeStart;
  while (comparePlanDates(current, rangeEnd) <= 0) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

export interface CalendarPlanDayEntry {
  plan_id: string;
  title: string;
  start_date: string;
  end_date: string;
  cover_thumbnail_url: string | null;
  date: string;
}

export function expandPlansForCalendar(
  plans: Array<{
    id: string;
    title: string;
    start_date: string | null;
    end_date: string | null;
    cover_thumbnail_url: string | null;
  }>,
  from: string,
  to: string,
): CalendarPlanDayEntry[] {
  const entries: CalendarPlanDayEntry[] = [];

  for (const plan of plans) {
    if (!plan.start_date) continue;
    const end = plan.end_date ?? plan.start_date;
    const dates = expandPlanToDates(plan.start_date, end, from, to);
    for (const date of dates) {
      entries.push({
        plan_id: plan.id,
        title: plan.title,
        start_date: plan.start_date,
        end_date: end,
        cover_thumbnail_url: plan.cover_thumbnail_url,
        date,
      });
    }
  }

  return entries.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.title.localeCompare(b.title);
  });
}

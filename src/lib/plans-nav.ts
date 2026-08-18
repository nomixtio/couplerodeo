export type PlansTab = "all" | "new";

export function parsePlansTab(value: string | undefined): PlansTab {
  if (value === "new") return "new";
  return "all";
}

export type PlanDetailTab = "media" | "notes" | "budget";

export const PLAN_DETAIL_TABS: PlanDetailTab[] = ["media", "notes", "budget"];

export const PLAN_DETAIL_TAB_LABELS: Record<PlanDetailTab, string> = {
  media: "Media",
  notes: "Notes",
  budget: "Budget",
};

export function parsePlanDetailTab(value: string | undefined): PlanDetailTab {
  if (value === "notes" || value === "budget") return value;
  return "media";
}

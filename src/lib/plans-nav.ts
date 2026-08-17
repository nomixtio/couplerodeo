export type PlansTab = "all" | "new";

export function parsePlansTab(value: string | undefined): PlansTab {
  if (value === "new") return "new";
  return "all";
}

export type PlanDetailTab = "overview" | "notes" | "media" | "budget";

export function parsePlanDetailTab(value: string | undefined): PlanDetailTab {
  if (value === "notes" || value === "media" || value === "budget") {
    return value;
  }
  return "overview";
}

import { useMemo } from "react";
import { monthRange, todayDateString } from "../../shared/calendar";
import type { CalendarEvent, CalendarPlanDay } from "../lib/api";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface CalendarMonthViewProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  plans?: CalendarPlanDay[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function daysInMonthGrid(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: (string | null)[] = [];

  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push(dateStr);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function CalendarMonthView({
  year,
  month,
  events,
  plans = [],
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: CalendarMonthViewProps) {
  const today = todayDateString();
  const cells = useMemo(() => daysInMonthGrid(year, month), [year, month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.event_date) ?? [];
      list.push(event);
      map.set(event.event_date, list);
    }
    return map;
  }, [events]);

  const plansByDate = useMemo(() => {
    const map = new Map<string, CalendarPlanDay[]>();
    for (const plan of plans) {
      const list = map.get(plan.date) ?? [];
      if (!list.some((entry) => entry.plan_id === plan.plan_id)) {
        list.push(plan);
      }
      map.set(plan.date, list);
    }
    return map;
  }, [plans]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="calendar-month-view card">
      <div className="calendar-month-header">
        <button type="button" className="btn ghost" onClick={onPrevMonth}>
          ←
        </button>
        <h2>{monthLabel}</h2>
        <button type="button" className="btn ghost" onClick={onNextMonth}>
          →
        </button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="calendar-weekday">
            {label}
          </span>
        ))}
      </div>

      <div className="calendar-grid" role="grid" aria-label={monthLabel}>
        {cells.map((dateStr, index) => {
          if (!dateStr) {
            return (
              <div
                key={`empty-${index}`}
                className="calendar-day calendar-day-empty"
                aria-hidden
              />
            );
          }

          const dayEvents = eventsByDate.get(dateStr) ?? [];
          const dayPlans = plansByDate.get(dateStr) ?? [];
          const hasItems = dayEvents.length > 0 || dayPlans.length > 0;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={dateStr}
              type="button"
              className={`calendar-day${isToday ? " today" : ""}${isSelected ? " selected" : ""}${hasItems ? " has-events" : ""}`}
              onClick={() => onSelectDate(dateStr)}
              aria-label={`${dateStr}${hasItems ? `, ${dayEvents.length} event(s), ${dayPlans.length} plan(s)` : ""}`}
            >
              <span className="calendar-day-number">
                {Number(dateStr.slice(8, 10))}
              </span>
              {hasItems && (
                <span className="calendar-day-dots" aria-hidden>
                  {dayEvents.length > 0 && (
                    <span className="calendar-dot calendar-dot-event">•</span>
                  )}
                  {dayPlans.length > 0 && (
                    <span className="calendar-dot calendar-dot-plan">•</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function getInitialMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function monthFetchRange(year: number, month: number) {
  return monthRange(year, month);
}

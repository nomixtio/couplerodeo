import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchCalendarFeed,
  fetchMe,
  fetchUpcomingEvents,
  type CalendarEvent,
  type CalendarPlanDay,
  type MeResponse,
} from "../lib/api";
import { CalendarEventComposer } from "../components/CalendarEventComposer";
import { CalendarEventCard } from "../components/CalendarEventCard";
import { PageHeaderToggle } from "../components/PageHeaderToggle";
import {
  CalendarMonthView,
  getInitialMonth,
  monthFetchRange,
} from "../components/CalendarMonthView";
import { usePushRefresh } from "../components/PushListener";
import { PageLoader } from "../components/PageLoader";
import { parseCalendarTab } from "../lib/calendar-nav";
import { hasSession } from "../lib/partner";
import { formatCalendarDate, compareCalendarEvents } from "../../shared/calendar";

export const Route = createFileRoute("/calendar")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: parseCalendarTab(typeof search.tab === "string" ? search.tab : undefined),
    date: typeof search.date === "string" ? search.date : undefined,
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const navigate = useNavigate();
  const { tab, date: searchDate } = Route.useSearch();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([]);
  const [monthPlans, setMonthPlans] = useState<CalendarPlanDay[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [{ year, month }, setViewMonth] = useState(getInitialMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    searchDate ?? null,
  );
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [addPrefillDate, setAddPrefillDate] = useState<string | undefined>();
  const [lastViewTab, setLastViewTab] = useState<"month" | "upcoming">("month");

  const loadMonthEvents = useCallback(async () => {
    const { from, to } = monthFetchRange(year, month);
    const data = await fetchCalendarFeed(from, to);
    setMonthEvents(data.events);
    setMonthPlans(data.plans);
  }, [year, month]);

  const loadUpcomingEvents = useCallback(async () => {
    const data = await fetchUpcomingEvents();
    setUpcomingEvents(data.events);
  }, []);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadMonthEvents(), loadUpcomingEvents()]);
  }, [loadMonthEvents, loadUpcomingEvents]);

  useEffect(() => {
    if (!hasSession()) {
      navigate({ to: "/connect" });
      return;
    }

    Promise.all([fetchMe(), loadMonthEvents(), loadUpcomingEvents()])
      .then(([meData]) => {
        if (!meData.partnerConnected) {
          navigate({ to: "/pairing" });
          return;
        }
        setMe(meData);
      })
      .catch((err) => {
        console.error(err);
        navigate({ to: "/connect" });
      })
      .finally(() => setLoading(false));
  }, [navigate, loadMonthEvents, loadUpcomingEvents]);

  useEffect(() => {
    loadMonthEvents().catch(console.error);
  }, [loadMonthEvents]);

  useEffect(() => {
    const interval = setInterval(() => {
      reloadAll().catch(console.error);
    }, 10000);
    return () => clearInterval(interval);
  }, [reloadAll]);

  usePushRefresh(() => {
    reloadAll().catch(console.error);
  });

  useEffect(() => {
    if (searchDate) setSelectedDate(searchDate);
  }, [searchDate]);

  useEffect(() => {
    if (tab === "month" || tab === "upcoming") {
      setLastViewTab(tab);
    }
  }, [tab]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return monthEvents
      .filter((e) => e.event_date === selectedDate)
      .sort(compareCalendarEvents);
  }, [monthEvents, selectedDate]);

  const selectedDayPlans = useMemo(() => {
    if (!selectedDate) return [];
    const seen = new Set<string>();
    return monthPlans.filter((plan) => {
      if (plan.date !== selectedDate || seen.has(plan.plan_id)) return false;
      seen.add(plan.plan_id);
      return true;
    });
  }, [monthPlans, selectedDate]);

  const groupedUpcoming = useMemo(() => {
    const groups = new Map<string, CalendarEvent[]>();
    for (const event of upcomingEvents) {
      const list = groups.get(event.event_date) ?? [];
      list.push(event);
      groups.set(event.event_date, list);
    }
    return [...groups.entries()].map(([date, events]) => [
      date,
      [...events].sort(compareCalendarEvents),
    ] as const);
  }, [upcomingEvents]);

  function selectTab(next: "month" | "upcoming") {
    navigate({ to: "/calendar", search: { tab: next } });
  }

  function openAddMode(date?: string) {
    setEditingEvent(null);
    setAddPrefillDate(date);
    navigate({
      to: "/calendar",
      search: { tab: "add", ...(date ? { date } : {}) },
    });
  }

  function closeAddMode() {
    setEditingEvent(null);
    setAddPrefillDate(undefined);
    navigate({ to: "/calendar", search: { tab: lastViewTab } });
  }

  function goToAddWithDate(date: string) {
    openAddMode(date);
  }

  function handleEdit(event: CalendarEvent) {
    setEditingEvent(event);
    navigate({ to: "/calendar", search: { tab: "add" } });
  }

  async function handleComposerClosed() {
    setEditingEvent(null);
    setAddPrefillDate(undefined);
    await reloadAll();
    navigate({ to: "/calendar", search: { tab: lastViewTab } });
  }

  if (!me) {
    return (
      <div className="page calendar-page">
        <PageLoader label={loading ? "Loading" : "Redirecting"} />
      </div>
    );
  }

  const adding = tab === "add";

  return (
    <div className={`page calendar-page${adding ? " note-sheet-page" : ""}`}>
      {!adding && (
        <div className="page-header">
          <h1>Calendar</h1>
          <PageHeaderToggle
            mode="add"
            addLabel="Add event"
            onClick={() => openAddMode()}
          />
        </div>
      )}

      {!adding && (
        <div className="section-tabs" role="tablist" aria-label="Calendar views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "month"}
            className={tab === "month" ? "active" : ""}
            onClick={() => selectTab("month")}
          >
            Month
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "upcoming"}
            className={tab === "upcoming" ? "active" : ""}
            onClick={() => selectTab("upcoming")}
          >
            Upcoming
          </button>
        </div>
      )}

      {tab === "month" && (
        <section role="tabpanel" aria-label="Month">
          <CalendarMonthView
            year={year}
            month={month}
            events={monthEvents}
            plans={monthPlans}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onPrevMonth={() =>
              setViewMonth(({ year, month }) => {
                if (month === 0) return { year: year - 1, month: 11 };
                return { year, month: month - 1 };
              })
            }
            onNextMonth={() =>
              setViewMonth(({ year, month }) => {
                if (month === 11) return { year: year + 1, month: 0 };
                return { year, month: month + 1 };
              })
            }
          />

          {selectedDate && (
            <section className="calendar-day-panel card">
              <div className="calendar-day-panel-header">
                <h3>{formatCalendarDate(selectedDate)}</h3>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => goToAddWithDate(selectedDate)}
                >
                  Add event
                </button>
              </div>

              {selectedDayEvents.length === 0 && selectedDayPlans.length === 0 ? (
                <p className="hint">No events or plans on this day.</p>
              ) : (
                <div className="thread">
                  {selectedDayPlans.map((plan) => (
                    <Link
                      key={plan.plan_id}
                      to="/plans/$planId"
                      params={{ planId: plan.plan_id }}
                      className="calendar-plan-link card"
                    >
                      <span className="badge">plan</span>
                      <strong>{plan.title}</strong>
                    </Link>
                  ))}
                  {selectedDayEvents.map((event) => (
                    <CalendarEventCard
                      key={event.id}
                      event={event}
                      currentPartnerId={me.partnerId}
                      onEdit={handleEdit}
                      onDeleted={() => reloadAll().catch(console.error)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </section>
      )}

      {tab === "upcoming" && (
        <section className="thread" role="tabpanel" aria-label="Upcoming">
          {loading ? (
            <p className="hint">Loading…</p>
          ) : upcomingEvents.length === 0 ? (
            <p className="hint">
              No upcoming events. Tap <strong>+</strong> to plan something together!
            </p>
          ) : (
            groupedUpcoming.map(([date, events]) => (
              <div key={date} className="calendar-date-group">
                <h3 className="calendar-date-group-label">
                  {formatCalendarDate(date)}
                </h3>
                {events.map((event) => (
                  <CalendarEventCard
                    key={event.id}
                    event={event}
                    currentPartnerId={me.partnerId}
                    onEdit={handleEdit}
                    onDeleted={() => reloadAll().catch(console.error)}
                  />
                ))}
              </div>
            ))
          )}
        </section>
      )}

      {tab === "add" && (
        <CalendarEventComposer
          initialDate={addPrefillDate ?? searchDate}
          editingEvent={editingEvent}
          onSaved={() => handleComposerClosed().catch(console.error)}
          onCancel={closeAddMode}
          onDeleted={() => handleComposerClosed().catch(console.error)}
        />
      )}
    </div>
  );
}

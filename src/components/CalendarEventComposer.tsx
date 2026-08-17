import { useEffect, useState } from "react";
import {
  CALENDAR_NOTES_MAX_LENGTH,
  CALENDAR_TITLE_MAX_LENGTH,
  reminderPresetAt9am,
  todayDateString,
  toDatetimeLocalValue,
} from "../../shared/calendar";
import {
  createCalendarEvent,
  updateCalendarEvent,
  type CalendarEvent,
} from "../lib/api";

interface CalendarEventComposerProps {
  initialDate?: string;
  editingEvent?: CalendarEvent | null;
  showTitle?: boolean;
  onSaved?: () => void;
  onCancelEdit?: () => void;
}

export function CalendarEventComposer({
  initialDate,
  editingEvent,
  showTitle = true,
  onSaved,
  onCancelEdit,
}: CalendarEventComposerProps) {
  const [title, setTitle] = useState(editingEvent?.title ?? "");
  const [eventDate, setEventDate] = useState(
    editingEvent?.event_date ?? initialDate ?? todayDateString(),
  );
  const [eventTime, setEventTime] = useState(editingEvent?.event_time ?? "");
  const [notes, setNotes] = useState(editingEvent?.notes ?? "");
  const [remindEnabled, setRemindEnabled] = useState(
    editingEvent?.remind_at != null,
  );
  const [remindAtLocal, setRemindAtLocal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialDate && !editingEvent) {
      setEventDate(initialDate);
    }
  }, [initialDate, editingEvent]);

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setEventDate(editingEvent.event_date);
      setEventTime(editingEvent.event_time ?? "");
      setNotes(editingEvent.notes ?? "");
      setRemindEnabled(editingEvent.remind_at != null);
      setRemindAtLocal(
        editingEvent.remind_at
          ? toDatetimeLocalValue(editingEvent.remind_at)
          : "",
      );
    }
  }, [editingEvent]);

  function applyPreset(daysBefore: number) {
    if (!eventDate) return;
    const ms = reminderPresetAt9am(eventDate, daysBefore, eventTime || null);
    setRemindEnabled(true);
    setRemindAtLocal(toDatetimeLocalValue(ms));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }

    let remindAt: number | undefined;
    if (remindEnabled) {
      if (!remindAtLocal) {
        setError("Choose when to be reminded");
        return;
      }
      const parsed = new Date(remindAtLocal).getTime();
      if (!Number.isFinite(parsed) || parsed <= Date.now()) {
        setError("Reminder must be in the future");
        return;
      }
      remindAt = parsed;
    }

    setSaving(true);
    try {
      const payload = {
        title: trimmedTitle,
        eventDate,
        eventTime: eventTime || undefined,
        notes: notes.trim() || undefined,
        remindAt,
      };

      if (editingEvent) {
        await updateCalendarEvent(editingEvent.id, payload);
      } else {
        await createCalendarEvent(payload);
      }

      if (!editingEvent) {
        setTitle("");
        setNotes("");
        setRemindEnabled(false);
        setRemindAtLocal("");
        setEventDate(initialDate ?? todayDateString());
        setEventTime("");
      }
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="calendar-composer card composer">
      {showTitle && (
        <h2>{editingEvent ? "Edit event" : "Add event"}</h2>
      )}

      <form onSubmit={handleSubmit}>
        <label>
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Date night"
            maxLength={CALENDAR_TITLE_MAX_LENGTH}
            disabled={saving}
            required
          />
        </label>

        <label>
          Date
          <span className="calendar-native-input">
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              disabled={saving}
              required
            />
          </span>
        </label>

        <label>
          Time
          <span className="calendar-native-input">
            <input
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              disabled={saving}
              required
            />
          </span>
        </label>

        <label>
          Notes (optional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dinner at French restaurant, dress fancy…"
            rows={3}
            maxLength={CALENDAR_NOTES_MAX_LENGTH}
            disabled={saving}
          />
        </label>

        <div className="calendar-reminder-block">
          <label className="calendar-reminder-toggle">
            <input
              type="checkbox"
              checked={remindEnabled}
              onChange={(e) => setRemindEnabled(e.target.checked)}
              disabled={saving}
            />
            Remind us
          </label>

          {remindEnabled && (
            <>
              <label>
                Reminder time
                <span className="calendar-native-input">
                  <input
                    type="datetime-local"
                    value={remindAtLocal}
                    onChange={(e) => setRemindAtLocal(e.target.value)}
                    disabled={saving}
                    required
                  />
                </span>
              </label>

              <div className="calendar-reminder-presets">
                <button
                  type="button"
                  className="btn ghost"
                  disabled={saving || !eventDate}
                  onClick={() => applyPreset(0)}
                >
                  Morning of (9:00)
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={saving || !eventDate}
                  onClick={() => applyPreset(1)}
                >
                  Day before (9:00)
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={saving || !eventDate}
                  onClick={() => applyPreset(7)}
                >
                  1 week before (9:00)
                </button>
              </div>

              <p className="hint">
                Both of you will get a notification at this time (if
                notifications are enabled).
              </p>
            </>
          )}
        </div>

        {error && <p className="hint error">{error}</p>}

        <div className="calendar-composer-actions">
          {editingEvent && onCancelEdit && (
            <button
              type="button"
              className="btn ghost"
              onClick={onCancelEdit}
              disabled={saving}
            >
              Cancel
            </button>
          )}
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "Saving…" : editingEvent ? "Save changes" : "Add event"}
          </button>
        </div>
      </form>
    </div>
  );
}

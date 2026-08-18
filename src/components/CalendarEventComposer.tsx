import { useEffect, useId, useRef, useState } from "react";
import {
  CALENDAR_NOTES_MAX_LENGTH,
  CALENDAR_TITLE_MAX_LENGTH,
  formatCalendarDate,
  formatCalendarEventWhen,
  formatCalendarTime,
  reminderPresetAt9am,
  todayDateString,
  toDatetimeLocalValue,
} from "../../shared/calendar";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
  type CalendarEvent,
} from "../lib/api";

interface CalendarEventComposerProps {
  initialDate?: string;
  editingEvent?: CalendarEvent | null;
  onSaved?: () => void;
  onCancel?: () => void;
  onDeleted?: () => void;
}

export function CalendarEventComposer({
  initialDate,
  editingEvent,
  onSaved,
  onCancel,
  onDeleted,
}: CalendarEventComposerProps) {
  const isEdit = Boolean(editingEvent);
  const formId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
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
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) {
      titleRef.current?.focus();
    }
  }, [isEdit]);

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

  function addReminder() {
    applyPreset(0);
  }

  function clearReminder() {
    setRemindEnabled(false);
    setRemindAtLocal("");
  }

  function formatReminderDisplay(value: string) {
    const [date, time] = value.split("T");
    if (!date) return "";
    return formatCalendarEventWhen(date, time || null);
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

  async function handleDelete() {
    if (!editingEvent) return;
    if (!window.confirm(`Remove "${editingEvent.title}"?`)) return;
    setDeleting(true);
    setError("");
    try {
      await deleteCalendarEvent(editingEvent.id);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  return (
    <div className="note-sheet calendar-sheet">
      <header className="note-sheet-toolbar">
        <button
          type="button"
          className="note-sheet-back"
          onClick={onCancel}
          disabled={busy}
        >
          ← Calendar
        </button>
        <div className="note-sheet-toolbar-actions">
          {isEdit && (
            <button
              type="button"
              className="note-sheet-delete-btn"
              onClick={() => handleDelete().catch(console.error)}
              disabled={busy}
            >
              {deleting ? "Removing…" : "Delete"}
            </button>
          )}
          <button
            type="submit"
            form={formId}
            className="note-sheet-done-btn"
            disabled={busy}
          >
            {saving ? "Saving…" : "Done"}
          </button>
        </div>
      </header>

      <div className="note-sheet-surface calendar-sheet-surface">
        <form id={formId} onSubmit={handleSubmit} className="note-sheet-form">
          <input
            ref={titleRef}
            type="text"
            className="note-sheet-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            maxLength={CALENDAR_TITLE_MAX_LENGTH}
            disabled={busy}
            aria-label="Title"
            required
          />

          <div className="calendar-sheet-meta">
            <div className="calendar-sheet-meta-row">
              <span className="calendar-sheet-meta-label">Date</span>
              <label className="calendar-sheet-meta-value">
                <span className="calendar-sheet-meta-display">
                  {eventDate ? formatCalendarDate(eventDate) : "Choose a date"}
                </span>
                <input
                  type="date"
                  className="calendar-sheet-meta-picker"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  disabled={busy}
                  required
                  aria-label="Date"
                />
              </label>
            </div>
            <div className="calendar-sheet-meta-row">
              <span className="calendar-sheet-meta-label">Time</span>
              <label className="calendar-sheet-meta-value">
                <span
                  className={`calendar-sheet-meta-display${eventTime ? "" : " is-placeholder"}`}
                >
                  {eventTime ? formatCalendarTime(eventTime) : "Choose a time"}
                </span>
                <input
                  type="time"
                  className="calendar-sheet-meta-picker"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  disabled={busy}
                  required
                  aria-label="Time"
                />
              </label>
            </div>
          </div>

          <textarea
            className="note-sheet-body calendar-sheet-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note…"
            maxLength={CALENDAR_NOTES_MAX_LENGTH}
            disabled={busy}
            aria-label="Notes"
          />

          <div className="calendar-sheet-reminder">
            {remindEnabled ? (
              <>
                <div className="calendar-sheet-meta-row">
                  <span className="calendar-sheet-meta-label">Reminder</span>
                  <label className="calendar-sheet-meta-value">
                    <span
                      className={`calendar-sheet-meta-display${remindAtLocal ? "" : " is-placeholder"}`}
                    >
                      {remindAtLocal
                        ? formatReminderDisplay(remindAtLocal)
                        : "Choose a time"}
                    </span>
                    <input
                      type="datetime-local"
                      className="calendar-sheet-meta-picker"
                      value={remindAtLocal}
                      onChange={(e) => setRemindAtLocal(e.target.value)}
                      disabled={busy}
                      required
                      aria-label="Reminder time"
                    />
                  </label>
                  <button
                    type="button"
                    className="note-sheet-list-remove"
                    onClick={clearReminder}
                    disabled={busy}
                    aria-label="Remove reminder"
                  >
                    ×
                  </button>
                </div>

                <div className="calendar-sheet-presets">
                  <button
                    type="button"
                    disabled={busy || !eventDate}
                    onClick={() => applyPreset(0)}
                  >
                    Morning of
                  </button>
                  <button
                    type="button"
                    disabled={busy || !eventDate}
                    onClick={() => applyPreset(1)}
                  >
                    Day before
                  </button>
                  <button
                    type="button"
                    disabled={busy || !eventDate}
                    onClick={() => applyPreset(7)}
                  >
                    1 week before
                  </button>
                </div>

                <p className="hint">
                  Both of you will get a notification at this time (if
                  notifications are enabled).
                </p>
              </>
            ) : (
              <button
                type="button"
                className="note-sheet-add-item"
                onClick={addReminder}
                disabled={busy || !eventDate}
              >
                Add a reminder
              </button>
            )}
          </div>
        </form>
      </div>

      {error && <p className="hint error note-sheet-error">{error}</p>}
    </div>
  );
}

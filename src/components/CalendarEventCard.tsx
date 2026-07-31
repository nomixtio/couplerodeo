import { useState } from "react";
import { formatCalendarEventWhen } from "../../shared/calendar";
import type { CalendarEvent } from "../lib/api";
import { deleteCalendarEvent } from "../lib/api";
import { formatUpdateDate } from "../lib/format";
import { partnerLabel } from "../lib/partner";

interface CalendarEventCardProps {
  event: CalendarEvent;
  currentPartnerId: string;
  onEdit?: (event: CalendarEvent) => void;
  onDeleted?: () => void;
}

export function CalendarEventCard({
  event,
  currentPartnerId,
  onEdit,
  onDeleted,
}: CalendarEventCardProps) {
  const isMine = event.from_partner_id === currentPartnerId;
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!window.confirm(`Remove "${event.title}"?`)) return;
    setError("");
    setDeleting(true);
    try {
      await deleteCalendarEvent(event.id);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className={`calendar-event-card card ${isMine ? "mine" : "theirs"}`}>
      <header>
        <span className="badge">event</span>
        <span className="meta">
          {partnerLabel(
            event.from_partner_id,
            currentPartnerId,
            event.from_label,
          )}{" "}
          · {formatUpdateDate(event.created_at)}
        </span>
      </header>

      <h3 className="calendar-event-title">{event.title}</h3>
      <p className="calendar-event-date">
        {formatCalendarEventWhen(event.event_date, event.event_time)}
      </p>

      {event.notes && <p className="calendar-event-notes">{event.notes}</p>}

      {event.remind_at != null && (
        <p className="calendar-event-reminder hint">
          Reminder: {formatUpdateDate(event.remind_at)}
        </p>
      )}

      {error && <p className="hint error">{error}</p>}

      <div className="calendar-event-actions">
        {onEdit && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => onEdit(event)}
            disabled={deleting}
          >
            Edit
          </button>
        )}
        <button
          type="button"
          className="btn ghost calendar-delete-btn"
          onClick={() => handleDelete().catch(console.error)}
          disabled={deleting}
        >
          {deleting ? "Removing…" : "Remove"}
        </button>
      </div>
    </article>
  );
}

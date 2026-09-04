import { formatCalendarEventWhen } from "../shared/calendar";
import { APP_SLUG } from "../shared/app";
import {
  getDueReminders,
  getPartnersByCoupleId,
  markReminderSent,
  type CalendarEventRow,
} from "./db";
import { sendPartnerPush } from "./partner-push";

interface ReminderEnv {
  DB: D1Database;
  VAPID_PRIVATE_KEY: string;
  PUBLIC_ORIGIN?: string;
}

export async function processDueReminders(
  db: D1Database,
  vapidPrivateKey: string,
  origin: string,
  now = Date.now(),
): Promise<number> {
  const due = await getDueReminders(db, now);
  let sentCount = 0;

  for (const event of due) {
    const sent = await sendReminderForEvent(db, event, vapidPrivateKey, origin);
    if (sent) sentCount += 1;
    await markReminderSent(db, event.id, now);
  }

  return sentCount;
}

async function sendReminderForEvent(
  db: D1Database,
  event: CalendarEventRow,
  vapidPrivateKey: string,
  origin: string,
): Promise<boolean> {
  const partners = await getPartnersByCoupleId(db, event.couple_id);
  const formattedWhen = formatCalendarEventWhen(
    event.event_date,
    event.event_time,
  );
  let anySent = false;

  for (const partner of partners) {
    const pushResult = await sendPartnerPush(
      db,
      partner,
      event.couple_id,
      vapidPrivateKey,
      {
        title: `Reminder: ${event.title}`,
        body: formattedWhen,
        url: "/calendar?tab=upcoming",
        tag: `${APP_SLUG}-calendar-reminder-${event.id}`,
      },
      origin,
    );
    if (pushResult.sent) anySent = true;
  }

  return anySent;
}

export async function handleScheduledReminders(
  _event: ScheduledEvent,
  env: ReminderEnv,
  _ctx: ExecutionContext,
): Promise<void> {
  const origin = env.PUBLIC_ORIGIN ?? "http://127.0.0.1:8787";
  try {
    const count = await processDueReminders(
      env.DB,
      env.VAPID_PRIVATE_KEY,
      origin,
    );
    if (count > 0) {
      console.log(`Calendar reminders sent for ${count} event(s)`);
    }
  } catch (err) {
    console.error("Calendar reminder cron failed:", err);
  }
}

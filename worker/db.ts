import {
  generateRecoveryCode,
} from "./codes";

export type QuestionType = "choice" | "scale" | "gif";

export interface Partner {
  id: string;
  couple_id: string;
  label: string;
  slot: number;
  recovery_code: string;
  push_subscription_json: string | null;
  capacity_level: number | null;
  capacity_updated_at: number | null;
}

export interface Couple {
  id: string;
  created_at: number;
}

export interface Session {
  id: string;
  partner_id: string;
  created_at: number;
  last_seen_at: number;
}

export interface QuestionRow {
  id: string;
  couple_id: string;
  from_partner_id: string;
  type: QuestionType;
  text: string;
  options_json: string | null;
  created_at: number;
}

export interface AnswerRow {
  id: string;
  question_id: string;
  partner_id: string;
  value: string;
  created_at: number;
}

export interface QuestionWithAnswer extends QuestionRow {
  answer: AnswerRow | null;
  from_label: string;
  answer_label: string | null;
}

async function generateUniquePersonalCode(db: D1Database): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRecoveryCode();
    const existing = await db
      .prepare("SELECT id FROM partners WHERE UPPER(recovery_code) = ?")
      .bind(code)
      .first();
    if (!existing) return code;
  }
  throw new Error("Could not generate unique personal code");
}

async function findPartnerByPersonalCode(
  db: D1Database,
  code: string,
): Promise<Partner | null> {
  const normalized = code.trim().toUpperCase();
  return db
    .prepare("SELECT * FROM partners WHERE UPPER(recovery_code) = ?")
    .bind(normalized)
    .first<Partner>();
}

async function createSession(
  db: D1Database,
  partnerId: string,
): Promise<string> {
  const now = Date.now();
  const sessionId = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO sessions (id, partner_id, created_at, last_seen_at) VALUES (?, ?, ?, ?)",
    )
    .bind(sessionId, partnerId, now, now)
    .run();
  return sessionId;
}

async function insertPartner(
  db: D1Database,
  coupleId: string,
  slot: number,
  label: string,
): Promise<{ partnerId: string; personalCode: string }> {
  const partnerId = crypto.randomUUID();
  const personalCode = await generateUniquePersonalCode(db);
  await db
    .prepare(
      "INSERT INTO partners (id, couple_id, label, push_subscription_json, slot, recovery_code) VALUES (?, ?, ?, NULL, ?, ?)",
    )
    .bind(partnerId, coupleId, label, slot, personalCode)
    .run();
  return { partnerId, personalCode };
}

export function normalizePartnerName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 30) return null;
  return trimmed;
}

export async function createCouple(
  db: D1Database,
  name: string,
): Promise<
  { sessionToken: string } | { error: "invalid_name" }
> {
  const label = normalizePartnerName(name);
  if (!label) return { error: "invalid_name" };

  const coupleId = crypto.randomUUID();
  const now = Date.now();

  await db
    .prepare("INSERT INTO couples (id, created_at) VALUES (?, ?)")
    .bind(coupleId, now)
    .run();

  const { partnerId } = await insertPartner(db, coupleId, 0, label);
  const sessionToken = await createSession(db, partnerId);
  return { sessionToken };
}

export async function connectWithPartnerCode(
  db: D1Database,
  code: string,
  name?: string,
): Promise<
  | { sessionToken: string; partnerConnected: boolean }
  | { error: "not_found" }
  | { error: "invalid_code" }
  | { error: "invalid_name" }
> {
  const codeOwner = await findPartnerByPersonalCode(db, code);
  if (!codeOwner) return { error: "not_found" };

  const partners = await getPartnersByCoupleId(db, codeOwner.couple_id);
  const targetSlot = codeOwner.slot === 0 ? 1 : 0;
  const existingTarget = partners.find((p) => p.slot === targetSlot);

  if (existingTarget) {
    const sessionToken = await createSession(db, existingTarget.id);
    return { sessionToken, partnerConnected: true };
  }

  if (targetSlot !== 1 || codeOwner.slot !== 0) {
    return { error: "invalid_code" };
  }

  const label = normalizePartnerName(name ?? "");
  if (!label) return { error: "invalid_name" };

  const { partnerId } = await insertPartner(db, codeOwner.couple_id, 1, label);
  const sessionToken = await createSession(db, partnerId);
  return { sessionToken, partnerConnected: true };
}

export async function getSessionPartner(
  db: D1Database,
  sessionToken: string,
): Promise<Partner | null> {
  const row = await db
    .prepare(
      `SELECT p.* FROM sessions s
       JOIN partners p ON p.id = s.partner_id
       WHERE s.id = ?`,
    )
    .bind(sessionToken)
    .first<Partner>();

  return row ?? null;
}

export async function touchSession(
  db: D1Database,
  sessionToken: string,
): Promise<void> {
  await db
    .prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?")
    .bind(Date.now(), sessionToken)
    .run();
}

export async function deleteSession(
  db: D1Database,
  sessionToken: string,
): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionToken).run();
}

export async function getCoupleById(
  db: D1Database,
  coupleId: string,
): Promise<Couple | null> {
  return db
    .prepare("SELECT id, created_at FROM couples WHERE id = ?")
    .bind(coupleId)
    .first<Couple>();
}

export async function getPartnersByCoupleId(
  db: D1Database,
  coupleId: string,
): Promise<Partner[]> {
  const { results } = await db
    .prepare("SELECT * FROM partners WHERE couple_id = ? ORDER BY slot")
    .bind(coupleId)
    .all<Partner>();
  return results ?? [];
}

export async function getPartner(
  db: D1Database,
  partnerId: string,
): Promise<Partner | null> {
  return db
    .prepare("SELECT * FROM partners WHERE id = ?")
    .bind(partnerId)
    .first<Partner>();
}

export async function getOtherPartner(
  db: D1Database,
  coupleId: string,
  partnerId: string,
): Promise<Partner | null> {
  return db
    .prepare(
      "SELECT * FROM partners WHERE couple_id = ? AND id != ? LIMIT 1",
    )
    .bind(coupleId, partnerId)
    .first<Partner>();
}

export async function savePushSubscription(
  db: D1Database,
  partnerId: string,
  subscriptionJson: string,
): Promise<void> {
  await db
    .prepare("UPDATE partners SET push_subscription_json = ? WHERE id = ?")
    .bind(subscriptionJson, partnerId)
    .run();
}

export async function clearPushSubscription(
  db: D1Database,
  partnerId: string,
): Promise<void> {
  await db
    .prepare("UPDATE partners SET push_subscription_json = NULL WHERE id = ?")
    .bind(partnerId)
    .run();
}

export async function updatePartnerCapacity(
  db: D1Database,
  partnerId: string,
  level: number,
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      "UPDATE partners SET capacity_level = ?, capacity_updated_at = ? WHERE id = ?",
    )
    .bind(level, now, partnerId)
    .run();
}

export function partnerCapacitySnapshot(partner: Partner) {
  return {
    level: partner.capacity_level,
    updatedAt: partner.capacity_updated_at,
  };
}

export async function createQuestion(
  db: D1Database,
  data: {
    id: string;
    coupleId: string;
    fromPartnerId: string;
    type: QuestionType;
    text: string;
    options?: string[];
  },
): Promise<QuestionRow> {
  const now = Date.now();
  const optionsJson =
    data.options && data.options.length > 0
      ? JSON.stringify(data.options)
      : null;

  await db
    .prepare(
      `INSERT INTO questions (id, couple_id, from_partner_id, type, text, options_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      data.id,
      data.coupleId,
      data.fromPartnerId,
      data.type,
      data.text,
      optionsJson,
      now,
    )
    .run();

  return {
    id: data.id,
    couple_id: data.coupleId,
    from_partner_id: data.fromPartnerId,
    type: data.type,
    text: data.text,
    options_json: optionsJson,
    created_at: now,
  };
}

export async function getQuestions(
  db: D1Database,
  coupleId: string,
): Promise<QuestionWithAnswer[]> {
  const { results: questions } = await db
    .prepare(
      `SELECT q.*, p.label as from_label
       FROM questions q
       JOIN partners p ON p.id = q.from_partner_id
       WHERE q.couple_id = ?
       ORDER BY q.created_at DESC`,
    )
    .bind(coupleId)
    .all<QuestionRow & { from_label: string }>();

  if (!questions?.length) return [];

  const questionIds = questions.map((q) => q.id);
  const placeholders = questionIds.map(() => "?").join(", ");
  const { results: answers } = await db
    .prepare(
      `SELECT a.*, p.label as answer_label
       FROM answers a
       JOIN partners p ON p.id = a.partner_id
       WHERE a.question_id IN (${placeholders})`,
    )
    .bind(...questionIds)
    .all<AnswerRow & { answer_label: string }>();

  const answerByQuestion = new Map(
    (answers ?? []).map((a) => [a.question_id, a]),
  );

  return questions.map((q) => {
    const answer = answerByQuestion.get(q.id) ?? null;
    return {
      ...q,
      answer: answer
        ? {
            id: answer.id,
            question_id: answer.question_id,
            partner_id: answer.partner_id,
            value: answer.value,
            created_at: answer.created_at,
          }
        : null,
      from_label: q.from_label,
      answer_label: answer?.answer_label ?? null,
    };
  });
}

export async function getQuestionById(
  db: D1Database,
  questionId: string,
  coupleId: string,
): Promise<QuestionWithAnswer | null> {
  const question = await db
    .prepare(
      `SELECT q.*, p.label as from_label
       FROM questions q
       JOIN partners p ON p.id = q.from_partner_id
       WHERE q.id = ? AND q.couple_id = ?`,
    )
    .bind(questionId, coupleId)
    .first<QuestionRow & { from_label: string }>();

  if (!question) return null;

  const answer = await db
    .prepare(
      `SELECT a.*, p.label as answer_label
       FROM answers a
       JOIN partners p ON p.id = a.partner_id
       WHERE a.question_id = ?`,
    )
    .bind(questionId)
    .first<AnswerRow & { answer_label: string }>();

  return {
    ...question,
    answer: answer
      ? {
          id: answer.id,
          question_id: answer.question_id,
          partner_id: answer.partner_id,
          value: answer.value,
          created_at: answer.created_at,
        }
      : null,
    from_label: question.from_label,
    answer_label: answer?.answer_label ?? null,
  };
}

export async function createAnswer(
  db: D1Database,
  data: {
    id: string;
    questionId: string;
    partnerId: string;
    value: string;
  },
): Promise<AnswerRow> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO answers (id, question_id, partner_id, value, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(data.id, data.questionId, data.partnerId, data.value, now)
    .run();

  return {
    id: data.id,
    question_id: data.questionId,
    partner_id: data.partnerId,
    value: data.value,
    created_at: now,
  };
}

export function sanitizePartner(partner: Partner) {
  const { recovery_code: _recovery, push_subscription_json: _push, ...rest } =
    partner;
  return rest;
}

export function sanitizePartners(partners: Partner[]) {
  return partners.map(sanitizePartner);
}

export interface UpdateRow {
  id: string;
  couple_id: string;
  from_partner_id: string;
  text: string;
  created_at: number;
}

export interface UpdateResponseRow {
  id: string;
  update_id: string;
  partner_id: string;
  gif_url: string;
  created_at: number;
}

export interface UpdateWithResponse extends UpdateRow {
  from_label: string;
  response: (UpdateResponseRow & { responder_label: string }) | null;
}

export async function createUpdate(
  db: D1Database,
  data: {
    id: string;
    coupleId: string;
    fromPartnerId: string;
    text: string;
  },
): Promise<UpdateRow> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO updates (id, couple_id, from_partner_id, text, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(data.id, data.coupleId, data.fromPartnerId, data.text, now)
    .run();

  return {
    id: data.id,
    couple_id: data.coupleId,
    from_partner_id: data.fromPartnerId,
    text: data.text,
    created_at: now,
  };
}

export async function getUpdates(
  db: D1Database,
  coupleId: string,
): Promise<UpdateWithResponse[]> {
  const { results: updates } = await db
    .prepare(
      `SELECT u.*, p.label as from_label
       FROM updates u
       JOIN partners p ON p.id = u.from_partner_id
       WHERE u.couple_id = ?
       ORDER BY u.created_at DESC`,
    )
    .bind(coupleId)
    .all<UpdateRow & { from_label: string }>();

  if (!updates?.length) return [];

  const updateIds = updates.map((u) => u.id);
  const placeholders = updateIds.map(() => "?").join(", ");
  const { results: responses } = await db
    .prepare(
      `SELECT r.*, p.label as responder_label
       FROM update_responses r
       JOIN partners p ON p.id = r.partner_id
       WHERE r.update_id IN (${placeholders})`,
    )
    .bind(...updateIds)
    .all<UpdateResponseRow & { responder_label: string }>();

  const responseByUpdate = new Map(
    (responses ?? []).map((r) => [r.update_id, r]),
  );

  return updates.map((update) => ({
    ...update,
    response: responseByUpdate.get(update.id) ?? null,
  }));
}

export async function getUpdateById(
  db: D1Database,
  updateId: string,
  coupleId: string,
): Promise<UpdateWithResponse | null> {
  const update = await db
    .prepare(
      `SELECT u.*, p.label as from_label
       FROM updates u
       JOIN partners p ON p.id = u.from_partner_id
       WHERE u.id = ? AND u.couple_id = ?`,
    )
    .bind(updateId, coupleId)
    .first<UpdateRow & { from_label: string }>();

  if (!update) return null;

  const response = await db
    .prepare(
      `SELECT r.*, p.label as responder_label
       FROM update_responses r
       JOIN partners p ON p.id = r.partner_id
       WHERE r.update_id = ?`,
    )
    .bind(updateId)
    .first<UpdateResponseRow & { responder_label: string }>();

  return {
    ...update,
    response: response ?? null,
  };
}

export async function createUpdateResponse(
  db: D1Database,
  data: {
    id: string;
    updateId: string;
    partnerId: string;
    gifUrl: string;
  },
): Promise<UpdateResponseRow> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO update_responses (id, update_id, partner_id, gif_url, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(data.id, data.updateId, data.partnerId, data.gifUrl, now)
    .run();

  return {
    id: data.id,
    update_id: data.updateId,
    partner_id: data.partnerId,
    gif_url: data.gifUrl,
    created_at: now,
  };
}

export interface CalendarEventRow {
  id: string;
  couple_id: string;
  from_partner_id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  notes: string | null;
  remind_at: number | null;
  reminder_sent_at: number | null;
  created_at: number;
  updated_at: number | null;
}

export interface CalendarEventWithLabel extends CalendarEventRow {
  from_label: string;
}

function mapCalendarEventWithLabel(
  row: CalendarEventRow & { from_label: string },
): CalendarEventWithLabel {
  return { ...row };
}

export async function createCalendarEvent(
  db: D1Database,
  data: {
    id: string;
    coupleId: string;
    fromPartnerId: string;
    title: string;
    eventDate: string;
    eventTime: string | null;
    notes: string | null;
    remindAt: number | null;
  },
): Promise<CalendarEventWithLabel> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO calendar_events
       (id, couple_id, from_partner_id, title, event_date, event_time, notes, remind_at, reminder_sent_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)`,
    )
    .bind(
      data.id,
      data.coupleId,
      data.fromPartnerId,
      data.title,
      data.eventDate,
      data.eventTime,
      data.notes,
      data.remindAt,
      now,
    )
    .run();

  const partner = await getPartner(db, data.fromPartnerId);
  return {
    id: data.id,
    couple_id: data.coupleId,
    from_partner_id: data.fromPartnerId,
    title: data.title,
    event_date: data.eventDate,
    event_time: data.eventTime,
    notes: data.notes,
    remind_at: data.remindAt,
    reminder_sent_at: null,
    created_at: now,
    updated_at: null,
    from_label: partner?.label ?? "Partner",
  };
}

export async function getCalendarEventsInRange(
  db: D1Database,
  coupleId: string,
  from: string,
  to: string,
): Promise<CalendarEventWithLabel[]> {
  const { results } = await db
    .prepare(
      `SELECT e.*, p.label as from_label
       FROM calendar_events e
       JOIN partners p ON p.id = e.from_partner_id
       WHERE e.couple_id = ? AND e.event_date >= ? AND e.event_date <= ?
       ORDER BY e.event_date ASC, e.event_time IS NULL, e.event_time ASC, e.created_at ASC`,
    )
    .bind(coupleId, from, to)
    .all<CalendarEventRow & { from_label: string }>();

  return (results ?? []).map(mapCalendarEventWithLabel);
}

export async function getUpcomingCalendarEvents(
  db: D1Database,
  coupleId: string,
  fromDate: string,
  limit: number,
): Promise<CalendarEventWithLabel[]> {
  const { results } = await db
    .prepare(
      `SELECT e.*, p.label as from_label
       FROM calendar_events e
       JOIN partners p ON p.id = e.from_partner_id
       WHERE e.couple_id = ? AND e.event_date >= ?
       ORDER BY e.event_date ASC, e.event_time IS NULL, e.event_time ASC, e.created_at ASC
       LIMIT ?`,
    )
    .bind(coupleId, fromDate, limit)
    .all<CalendarEventRow & { from_label: string }>();

  return (results ?? []).map(mapCalendarEventWithLabel);
}

export async function getCalendarEventById(
  db: D1Database,
  eventId: string,
  coupleId: string,
): Promise<CalendarEventWithLabel | null> {
  const row = await db
    .prepare(
      `SELECT e.*, p.label as from_label
       FROM calendar_events e
       JOIN partners p ON p.id = e.from_partner_id
       WHERE e.id = ? AND e.couple_id = ?`,
    )
    .bind(eventId, coupleId)
    .first<CalendarEventRow & { from_label: string }>();

  return row ? mapCalendarEventWithLabel(row) : null;
}

export async function updateCalendarEvent(
  db: D1Database,
  eventId: string,
  coupleId: string,
  data: {
    title: string;
    eventDate: string;
    eventTime: string | null;
    notes: string | null;
    remindAt: number | null;
    resetReminderSent: boolean;
  },
): Promise<CalendarEventWithLabel | null> {
  const existing = await getCalendarEventById(db, eventId, coupleId);
  if (!existing) return null;

  const now = Date.now();
  const reminderSentAt = data.resetReminderSent ? null : existing.reminder_sent_at;

  await db
    .prepare(
      `UPDATE calendar_events
       SET title = ?, event_date = ?, event_time = ?, notes = ?, remind_at = ?, reminder_sent_at = ?, updated_at = ?
       WHERE id = ? AND couple_id = ?`,
    )
    .bind(
      data.title,
      data.eventDate,
      data.eventTime,
      data.notes,
      data.remindAt,
      reminderSentAt,
      now,
      eventId,
      coupleId,
    )
    .run();

  return getCalendarEventById(db, eventId, coupleId);
}

export async function deleteCalendarEvent(
  db: D1Database,
  eventId: string,
  coupleId: string,
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM calendar_events WHERE id = ? AND couple_id = ?")
    .bind(eventId, coupleId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function getDueReminders(
  db: D1Database,
  now: number,
): Promise<CalendarEventRow[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM calendar_events
       WHERE remind_at IS NOT NULL
         AND remind_at <= ?
         AND reminder_sent_at IS NULL`,
    )
    .bind(now)
    .all<CalendarEventRow>();

  return results ?? [];
}

export async function markReminderSent(
  db: D1Database,
  eventId: string,
  now: number,
): Promise<void> {
  await db
    .prepare("UPDATE calendar_events SET reminder_sent_at = ? WHERE id = ?")
    .bind(now, eventId)
    .run();
}

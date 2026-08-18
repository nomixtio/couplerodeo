import {
  generateRecoveryCode,
} from "./codes";
import { parseTodoItemsJson, type TodoItem } from "../shared/notes";
import { normalizeCoverThumbnailUrl } from "../shared/plans";
import {
  normalizeUpdateKind,
  type UpdateKind,
} from "../shared/updates";

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
  kind: UpdateKind;
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

function mapUpdateRow<T extends UpdateRow>(row: T): T {
  return {
    ...row,
    kind: normalizeUpdateKind(row.kind),
  };
}

export async function createUpdate(
  db: D1Database,
  data: {
    id: string;
    coupleId: string;
    fromPartnerId: string;
    text: string;
    kind?: UpdateKind;
  },
): Promise<UpdateRow> {
  const now = Date.now();
  const kind = normalizeUpdateKind(data.kind);
  await db
    .prepare(
      `INSERT INTO updates (id, couple_id, from_partner_id, text, kind, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(data.id, data.coupleId, data.fromPartnerId, data.text, kind, now)
    .run();

  return {
    id: data.id,
    couple_id: data.coupleId,
    from_partner_id: data.fromPartnerId,
    text: data.text,
    kind,
    created_at: now,
  };
}

export async function getUpdates(
  db: D1Database,
  coupleId: string,
  options?: { limit?: number; before?: number },
): Promise<{ updates: UpdateWithResponse[]; hasMore: boolean }> {
  const limit = Math.min(Math.max(options?.limit ?? 25, 1), 50);
  const before = options?.before;

  let query = `SELECT u.*, p.label as from_label
       FROM updates u
       JOIN partners p ON p.id = u.from_partner_id
       WHERE u.couple_id = ?`;
  const binds: (string | number)[] = [coupleId];

  if (before != null && Number.isFinite(before)) {
    query += ` AND u.created_at < ?`;
    binds.push(before);
  }

  query += ` ORDER BY u.created_at DESC LIMIT ?`;
  binds.push(limit + 1);

  const { results: rows } = await db
    .prepare(query)
    .bind(...binds)
    .all<UpdateRow & { from_label: string }>();

  const fetched = rows ?? [];
  const hasMore = fetched.length > limit;
  const updates = fetched.slice(0, limit);

  if (!updates.length) {
    return { updates: [], hasMore: false };
  }

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

  const withResponses = updates.map((update) => ({
    ...mapUpdateRow(update),
    response: responseByUpdate.get(update.id) ?? null,
  }));

  return {
    updates: withResponses.reverse(),
    hasMore,
  };
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
    ...mapUpdateRow(update),
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

export interface NoteRow {
  id: string;
  couple_id: string;
  from_partner_id: string;
  plan_id: string | null;
  type: "simple" | "todo";
  title: string | null;
  body: string | null;
  items_json: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  deleted_by_partner_id: string | null;
}

export interface NoteWithLabel {
  id: string;
  couple_id: string;
  from_partner_id: string;
  plan_id: string | null;
  type: "simple" | "todo";
  title: string | null;
  body: string | null;
  items: TodoItem[] | null;
  created_at: number;
  updated_at: number;
  from_label: string;
  deleted_at: number | null;
  deleted_by_partner_id: string | null;
  deleted_by_label: string | null;
}

type NoteQueryRow = NoteRow & {
  from_label: string;
  deleted_by_label: string | null;
};

const NOTE_SELECT = `SELECT n.*, p.label as from_label, d.label as deleted_by_label
       FROM notes n
       JOIN partners p ON p.id = n.from_partner_id
       LEFT JOIN partners d ON d.id = n.deleted_by_partner_id`;

function mapNoteWithLabel(row: NoteQueryRow): NoteWithLabel {
  return {
    id: row.id,
    couple_id: row.couple_id,
    from_partner_id: row.from_partner_id,
    plan_id: row.plan_id ?? null,
    type: row.type,
    title: row.title,
    body: row.body,
    items: row.type === "todo" ? parseTodoItemsJson(row.items_json) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    from_label: row.from_label,
    deleted_at: row.deleted_at ?? null,
    deleted_by_partner_id: row.deleted_by_partner_id ?? null,
    deleted_by_label: row.deleted_by_label ?? null,
  };
}

export async function listNotes(
  db: D1Database,
  coupleId: string,
): Promise<NoteWithLabel[]> {
  const { results } = await db
    .prepare(
      `${NOTE_SELECT}
       WHERE n.couple_id = ? AND n.plan_id IS NULL
       ORDER BY n.updated_at DESC`,
    )
    .bind(coupleId)
    .all<NoteQueryRow>();

  return (results ?? []).map(mapNoteWithLabel);
}

export async function listPlanNotes(
  db: D1Database,
  coupleId: string,
  planId: string,
): Promise<NoteWithLabel[]> {
  const { results } = await db
    .prepare(
      `${NOTE_SELECT}
       WHERE n.couple_id = ? AND n.plan_id = ? AND n.deleted_at IS NULL
       ORDER BY n.updated_at DESC`,
    )
    .bind(coupleId, planId)
    .all<NoteQueryRow>();

  return (results ?? []).map(mapNoteWithLabel);
}

export async function getNoteById(
  db: D1Database,
  noteId: string,
  coupleId: string,
): Promise<NoteWithLabel | null> {
  const row = await db
    .prepare(
      `${NOTE_SELECT}
       WHERE n.id = ? AND n.couple_id = ?`,
    )
    .bind(noteId, coupleId)
    .first<NoteQueryRow>();

  return row ? mapNoteWithLabel(row) : null;
}

export async function createNote(
  db: D1Database,
  data: {
    id: string;
    coupleId: string;
    fromPartnerId: string;
    planId?: string | null;
    type: "simple" | "todo";
    title: string | null;
    body: string | null;
    itemsJson: string | null;
  },
): Promise<NoteWithLabel> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO notes
       (id, couple_id, from_partner_id, plan_id, type, title, body, items_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      data.id,
      data.coupleId,
      data.fromPartnerId,
      data.planId ?? null,
      data.type,
      data.title,
      data.body,
      data.itemsJson,
      now,
      now,
    )
    .run();

  const note = await getNoteById(db, data.id, data.coupleId);
  if (!note) throw new Error("Failed to create note");
  return note;
}

export async function updateNote(
  db: D1Database,
  noteId: string,
  coupleId: string,
  data: {
    title: string | null;
    body: string | null;
    itemsJson: string | null;
  },
): Promise<NoteWithLabel | null> {
  const existing = await getNoteById(db, noteId, coupleId);
  if (!existing || existing.deleted_at != null) return null;

  const now = Date.now();
  await db
    .prepare(
      `UPDATE notes
       SET title = ?, body = ?, items_json = ?, updated_at = ?
       WHERE id = ? AND couple_id = ? AND deleted_at IS NULL`,
    )
    .bind(
      data.title,
      data.body,
      data.itemsJson,
      now,
      noteId,
      coupleId,
    )
    .run();

  return getNoteById(db, noteId, coupleId);
}

export async function deleteNote(
  db: D1Database,
  noteId: string,
  coupleId: string,
  deletedByPartnerId: string,
): Promise<boolean> {
  const now = Date.now();
  const result = await db
    .prepare(
      `UPDATE notes
       SET deleted_at = ?, deleted_by_partner_id = ?
       WHERE id = ? AND couple_id = ? AND deleted_at IS NULL`,
    )
    .bind(now, deletedByPartnerId, noteId, coupleId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export interface PlanRow {
  id: string;
  couple_id: string;
  from_partner_id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_media_id: string | null;
  budget_amount_cents: number | null;
  budget_currency: string;
  created_at: number;
  updated_at: number;
}

export interface PlanWithLabel extends PlanRow {
  from_label: string;
  cover_thumbnail_url: string | null;
  note_count: number;
  media_count: number;
  spent_cents: number;
}

export interface PlanMediaRow {
  id: string;
  plan_id: string;
  couple_id: string;
  from_partner_id: string;
  type: "image" | "video";
  cf_image_id: string | null;
  cf_stream_id: string | null;
  playback_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  sort_order: number;
  status: "ready" | "processing" | "failed";
  created_at: number;
}

export interface PlanMediaWithLabel extends PlanMediaRow {
  from_label: string;
}

export interface PlanExpenseRow {
  id: string;
  plan_id: string;
  couple_id: string;
  from_partner_id: string;
  paid_by_partner_id: string;
  label: string;
  amount_cents: number;
  category: string | null;
  expense_date: string | null;
  created_at: number;
  updated_at: number;
}

export interface PlanExpenseWithLabel extends PlanExpenseRow {
  from_label: string;
  paid_by_label: string;
}

function mapPlanWithLabel(
  row: PlanRow & {
    from_label: string;
    cover_thumbnail_url?: string | null;
    note_count?: number;
    media_count?: number;
    spent_cents?: number;
  },
): PlanWithLabel {
  return {
    ...row,
    cover_thumbnail_url: normalizeCoverThumbnailUrl(
      row.cover_thumbnail_url ?? null,
    ),
    note_count: row.note_count ?? 0,
    media_count: row.media_count ?? 0,
    spent_cents: row.spent_cents ?? 0,
  };
}

export async function listPlans(
  db: D1Database,
  coupleId: string,
): Promise<PlanWithLabel[]> {
  const { results } = await db
    .prepare(
      `SELECT p.*, pr.label as from_label,
              cm.thumbnail_url as cover_thumbnail_url,
              (SELECT COUNT(*) FROM notes n WHERE n.plan_id = p.id AND n.deleted_at IS NULL) as note_count,
              (SELECT COUNT(*) FROM plan_media m WHERE m.plan_id = p.id) as media_count,
              (SELECT COALESCE(SUM(e.amount_cents), 0) FROM plan_expenses e WHERE e.plan_id = p.id) as spent_cents
       FROM plans p
       JOIN partners pr ON pr.id = p.from_partner_id
       LEFT JOIN plan_media cm ON cm.id = p.cover_media_id
       WHERE p.couple_id = ?
       ORDER BY p.updated_at DESC`,
    )
    .bind(coupleId)
    .all<
      PlanRow & {
        from_label: string;
        cover_thumbnail_url: string | null;
        note_count: number;
        media_count: number;
        spent_cents: number;
      }
    >();

  return (results ?? []).map(mapPlanWithLabel);
}

export async function getPlanById(
  db: D1Database,
  planId: string,
  coupleId: string,
): Promise<PlanWithLabel | null> {
  const row = await db
    .prepare(
      `SELECT p.*, pr.label as from_label,
              cm.thumbnail_url as cover_thumbnail_url,
              (SELECT COUNT(*) FROM notes n WHERE n.plan_id = p.id AND n.deleted_at IS NULL) as note_count,
              (SELECT COUNT(*) FROM plan_media m WHERE m.plan_id = p.id) as media_count,
              (SELECT COALESCE(SUM(e.amount_cents), 0) FROM plan_expenses e WHERE e.plan_id = p.id) as spent_cents
       FROM plans p
       JOIN partners pr ON pr.id = p.from_partner_id
       LEFT JOIN plan_media cm ON cm.id = p.cover_media_id
       WHERE p.id = ? AND p.couple_id = ?`,
    )
    .bind(planId, coupleId)
    .first<
      PlanRow & {
        from_label: string;
        cover_thumbnail_url: string | null;
        note_count: number;
        media_count: number;
        spent_cents: number;
      }
    >();

  return row ? mapPlanWithLabel(row) : null;
}

export async function getPlansInDateRange(
  db: D1Database,
  coupleId: string,
  from: string,
  to: string,
): Promise<PlanWithLabel[]> {
  const { results } = await db
    .prepare(
      `SELECT p.*, pr.label as from_label,
              cm.thumbnail_url as cover_thumbnail_url,
              0 as note_count, 0 as media_count, 0 as spent_cents
       FROM plans p
       JOIN partners pr ON pr.id = p.from_partner_id
       LEFT JOIN plan_media cm ON cm.id = p.cover_media_id
       WHERE p.couple_id = ?
         AND p.start_date IS NOT NULL
         AND p.start_date <= ?
         AND COALESCE(p.end_date, p.start_date) >= ?
       ORDER BY p.start_date ASC, p.title ASC`,
    )
    .bind(coupleId, to, from)
    .all<
      PlanRow & {
        from_label: string;
        cover_thumbnail_url: string | null;
        note_count: number;
        media_count: number;
        spent_cents: number;
      }
    >();

  return (results ?? []).map(mapPlanWithLabel);
}

export async function createPlan(
  db: D1Database,
  data: {
    id: string;
    coupleId: string;
    fromPartnerId: string;
    title: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    budgetAmountCents: number | null;
    budgetCurrency: string;
  },
): Promise<PlanWithLabel> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO plans
       (id, couple_id, from_partner_id, title, description, start_date, end_date,
        cover_media_id, budget_amount_cents, budget_currency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    )
    .bind(
      data.id,
      data.coupleId,
      data.fromPartnerId,
      data.title,
      data.description,
      data.startDate,
      data.endDate,
      data.budgetAmountCents,
      data.budgetCurrency,
      now,
      now,
    )
    .run();

  const plan = await getPlanById(db, data.id, data.coupleId);
  if (!plan) throw new Error("Failed to create plan");
  return plan;
}

export async function updatePlan(
  db: D1Database,
  planId: string,
  coupleId: string,
  data: {
    title: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    budgetAmountCents: number | null;
    budgetCurrency: string;
    coverMediaId?: string | null;
  },
): Promise<PlanWithLabel | null> {
  const existing = await getPlanById(db, planId, coupleId);
  if (!existing) return null;

  const now = Date.now();
  const coverMediaId =
    data.coverMediaId !== undefined ? data.coverMediaId : existing.cover_media_id;

  await db
    .prepare(
      `UPDATE plans
       SET title = ?, description = ?, start_date = ?, end_date = ?,
           cover_media_id = ?, budget_amount_cents = ?, budget_currency = ?, updated_at = ?
       WHERE id = ? AND couple_id = ?`,
    )
    .bind(
      data.title,
      data.description,
      data.startDate,
      data.endDate,
      coverMediaId,
      data.budgetAmountCents,
      data.budgetCurrency,
      now,
      planId,
      coupleId,
    )
    .run();

  return getPlanById(db, planId, coupleId);
}

export async function deletePlan(
  db: D1Database,
  planId: string,
  coupleId: string,
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM plans WHERE id = ? AND couple_id = ?")
    .bind(planId, coupleId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function listPlanMedia(
  db: D1Database,
  planId: string,
  coupleId: string,
): Promise<PlanMediaWithLabel[]> {
  const { results } = await db
    .prepare(
      `SELECT m.*, p.label as from_label
       FROM plan_media m
       JOIN partners p ON p.id = m.from_partner_id
       WHERE m.plan_id = ? AND m.couple_id = ?
       ORDER BY m.sort_order ASC, m.created_at ASC`,
    )
    .bind(planId, coupleId)
    .all<PlanMediaRow & { from_label: string }>();

  return results ?? [];
}

export async function getPlanMediaById(
  db: D1Database,
  mediaId: string,
  planId: string,
  coupleId: string,
): Promise<PlanMediaWithLabel | null> {
  const row = await db
    .prepare(
      `SELECT m.*, p.label as from_label
       FROM plan_media m
       JOIN partners p ON p.id = m.from_partner_id
       WHERE m.id = ? AND m.plan_id = ? AND m.couple_id = ?`,
    )
    .bind(mediaId, planId, coupleId)
    .first<PlanMediaRow & { from_label: string }>();

  return row ?? null;
}

export async function countPlanMediaByType(
  db: D1Database,
  planId: string,
  coupleId: string,
): Promise<{ images: number; videos: number }> {
  const { results } = await db
    .prepare(
      `SELECT type, COUNT(*) as count
       FROM plan_media
       WHERE plan_id = ? AND couple_id = ?
       GROUP BY type`,
    )
    .bind(planId, coupleId)
    .all<{ type: "image" | "video"; count: number }>();

  let images = 0;
  let videos = 0;
  for (const row of results ?? []) {
    if (row.type === "image") images = row.count;
    if (row.type === "video") videos = row.count;
  }
  return { images, videos };
}

export async function createPlanMedia(
  db: D1Database,
  data: {
    id: string;
    planId: string;
    coupleId: string;
    fromPartnerId: string;
    type: "image" | "video";
    cfImageId?: string | null;
    cfStreamId?: string | null;
    playbackUrl?: string | null;
    thumbnailUrl?: string | null;
    caption?: string | null;
    sortOrder: number;
    status: "ready" | "processing" | "failed";
  },
): Promise<PlanMediaWithLabel> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO plan_media
       (id, plan_id, couple_id, from_partner_id, type, cf_image_id, cf_stream_id,
        playback_url, thumbnail_url, caption, sort_order, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      data.id,
      data.planId,
      data.coupleId,
      data.fromPartnerId,
      data.type,
      data.cfImageId ?? null,
      data.cfStreamId ?? null,
      data.playbackUrl ?? null,
      data.thumbnailUrl ?? null,
      data.caption ?? null,
      data.sortOrder,
      data.status,
      now,
    )
    .run();

  const media = await getPlanMediaById(db, data.id, data.planId, data.coupleId);
  if (!media) throw new Error("Failed to create plan media");
  return media;
}

export async function updatePlanMedia(
  db: D1Database,
  mediaId: string,
  planId: string,
  coupleId: string,
  data: {
    playbackUrl?: string | null;
    thumbnailUrl?: string | null;
    status?: "ready" | "processing" | "failed";
    caption?: string | null;
  },
): Promise<PlanMediaWithLabel | null> {
  const existing = await getPlanMediaById(db, mediaId, planId, coupleId);
  if (!existing) return null;

  await db
    .prepare(
      `UPDATE plan_media
       SET playback_url = COALESCE(?, playback_url),
           thumbnail_url = COALESCE(?, thumbnail_url),
           status = COALESCE(?, status),
           caption = COALESCE(?, caption)
       WHERE id = ? AND plan_id = ? AND couple_id = ?`,
    )
    .bind(
      data.playbackUrl ?? null,
      data.thumbnailUrl ?? null,
      data.status ?? null,
      data.caption ?? null,
      mediaId,
      planId,
      coupleId,
    )
    .run();

  return getPlanMediaById(db, mediaId, planId, coupleId);
}

export async function deletePlanMedia(
  db: D1Database,
  mediaId: string,
  planId: string,
  coupleId: string,
): Promise<PlanMediaRow | null> {
  const existing = await getPlanMediaById(db, mediaId, planId, coupleId);
  if (!existing) return null;

  await db
    .prepare(
      "DELETE FROM plan_media WHERE id = ? AND plan_id = ? AND couple_id = ?",
    )
    .bind(mediaId, planId, coupleId)
    .run();

  return existing;
}

export async function clearPlanCoverIfMedia(
  db: D1Database,
  planId: string,
  coupleId: string,
  mediaId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE plans SET cover_media_id = NULL, updated_at = ?
       WHERE id = ? AND couple_id = ? AND cover_media_id = ?`,
    )
    .bind(Date.now(), planId, coupleId, mediaId)
    .run();
}

export async function listPlanExpenses(
  db: D1Database,
  planId: string,
  coupleId: string,
): Promise<PlanExpenseWithLabel[]> {
  const { results } = await db
    .prepare(
      `SELECT e.*, fp.label as from_label, pp.label as paid_by_label
       FROM plan_expenses e
       JOIN partners fp ON fp.id = e.from_partner_id
       JOIN partners pp ON pp.id = e.paid_by_partner_id
       WHERE e.plan_id = ? AND e.couple_id = ?
       ORDER BY e.created_at DESC`,
    )
    .bind(planId, coupleId)
    .all<PlanExpenseRow & { from_label: string; paid_by_label: string }>();

  return results ?? [];
}

export async function getPlanExpenseById(
  db: D1Database,
  expenseId: string,
  planId: string,
  coupleId: string,
): Promise<PlanExpenseWithLabel | null> {
  const row = await db
    .prepare(
      `SELECT e.*, fp.label as from_label, pp.label as paid_by_label
       FROM plan_expenses e
       JOIN partners fp ON fp.id = e.from_partner_id
       JOIN partners pp ON pp.id = e.paid_by_partner_id
       WHERE e.id = ? AND e.plan_id = ? AND e.couple_id = ?`,
    )
    .bind(expenseId, planId, coupleId)
    .first<PlanExpenseRow & { from_label: string; paid_by_label: string }>();

  return row ?? null;
}

export async function createPlanExpense(
  db: D1Database,
  data: {
    id: string;
    planId: string;
    coupleId: string;
    fromPartnerId: string;
    paidByPartnerId: string;
    label: string;
    amountCents: number;
    category: string | null;
    expenseDate: string | null;
  },
): Promise<PlanExpenseWithLabel> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO plan_expenses
       (id, plan_id, couple_id, from_partner_id, paid_by_partner_id,
        label, amount_cents, category, expense_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      data.id,
      data.planId,
      data.coupleId,
      data.fromPartnerId,
      data.paidByPartnerId,
      data.label,
      data.amountCents,
      data.category,
      data.expenseDate,
      now,
      now,
    )
    .run();

  await db
    .prepare("UPDATE plans SET updated_at = ? WHERE id = ? AND couple_id = ?")
    .bind(now, data.planId, data.coupleId)
    .run();

  const expense = await getPlanExpenseById(
    db,
    data.id,
    data.planId,
    data.coupleId,
  );
  if (!expense) throw new Error("Failed to create expense");
  return expense;
}

export async function updatePlanExpense(
  db: D1Database,
  expenseId: string,
  planId: string,
  coupleId: string,
  data: {
    label: string;
    amountCents: number;
    paidByPartnerId: string;
    category: string | null;
    expenseDate: string | null;
  },
): Promise<PlanExpenseWithLabel | null> {
  const existing = await getPlanExpenseById(db, expenseId, planId, coupleId);
  if (!existing) return null;

  const now = Date.now();
  await db
    .prepare(
      `UPDATE plan_expenses
       SET label = ?, amount_cents = ?, paid_by_partner_id = ?,
           category = ?, expense_date = ?, updated_at = ?
       WHERE id = ? AND plan_id = ? AND couple_id = ?`,
    )
    .bind(
      data.label,
      data.amountCents,
      data.paidByPartnerId,
      data.category,
      data.expenseDate,
      now,
      expenseId,
      planId,
      coupleId,
    )
    .run();

  await db
    .prepare("UPDATE plans SET updated_at = ? WHERE id = ? AND couple_id = ?")
    .bind(now, planId, coupleId)
    .run();

  return getPlanExpenseById(db, expenseId, planId, coupleId);
}

export async function deletePlanExpense(
  db: D1Database,
  expenseId: string,
  planId: string,
  coupleId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      "DELETE FROM plan_expenses WHERE id = ? AND plan_id = ? AND couple_id = ?",
    )
    .bind(expenseId, planId, coupleId)
    .run();

  if ((result.meta.changes ?? 0) > 0) {
    await db
      .prepare("UPDATE plans SET updated_at = ? WHERE id = ? AND couple_id = ?")
      .bind(Date.now(), planId, coupleId)
      .run();
    return true;
  }
  return false;
}

export async function getPlanMediaForCleanup(
  db: D1Database,
  planId: string,
  coupleId: string,
): Promise<PlanMediaRow[]> {
  const { results } = await db
    .prepare(
      "SELECT * FROM plan_media WHERE plan_id = ? AND couple_id = ?",
    )
    .bind(planId, coupleId)
    .all<PlanMediaRow>();

  return results ?? [];
}

import { clearSession, getSessionToken, setSessionToken } from "./partner";
import type { UpdateKind, UpdateResponseKind } from "../../shared/updates";
import type { MediaFilter, MediaSource } from "../../shared/media";
import type { QuestionType } from "../../shared/questions";

export type { QuestionType } from "../../shared/questions";

export interface Partner {
  id: string;
  couple_id: string;
  label: string;
  slot: number;
  push_subscription_json: string | null;
  capacity_level: number | null;
  capacity_updated_at: number | null;
}

export interface CapacitySnapshot {
  level: number | null;
  updatedAt: number | null;
}

export interface MeResponse {
  coupleId: string;
  myCode: string;
  myName: string;
  partnerName: string | null;
  shareCode: string | null;
  partnerId: string;
  partnerConnected: boolean;
  partners: Partner[];
  myCapacity: CapacitySnapshot;
  partnerCapacity: CapacitySnapshot;
}

export interface UpdateResponse {
  id: string;
  update_id: string;
  partner_id: string;
  gif_url: string | null;
  kind: UpdateResponseKind;
  value: string | null;
  created_at: number;
  responder_label: string;
}

export interface UpdateQuestion {
  type: QuestionType;
  options: string[] | null;
}

export interface UpdateLocation {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  label: string | null;
}

export interface Update {
  id: string;
  couple_id: string;
  from_partner_id: string;
  text: string;
  kind: UpdateKind;
  created_at: number;
  from_label: string;
  question: UpdateQuestion | null;
  location: UpdateLocation | null;
  media: MediaItem | null;
  response: UpdateResponse | null;
}

export interface CalendarEvent {
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
  from_label: string;
}

export type NoteType = "simple" | "todo";

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  completedBy?: string;
  completedAt?: number;
}

export interface Note {
  id: string;
  couple_id: string;
  from_partner_id: string;
  plan_id: string | null;
  type: NoteType;
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

export interface Plan {
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
  from_label: string;
  cover_thumbnail_url: string | null;
  note_count: number;
  media_count: number;
  spent_cents: number;
}

export type PlanMediaType = "image" | "video";
export type PlanMediaStatus = "ready" | "processing" | "failed";
export type { MediaFilter, MediaSource };

export interface MediaItem {
  id: string;
  couple_id: string;
  from_partner_id: string;
  source: MediaSource;
  plan_id: string | null;
  update_id: string | null;
  plan_title: string | null;
  type: PlanMediaType;
  cf_image_id: string | null;
  cf_stream_id: string | null;
  playback_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  sort_order: number;
  status: PlanMediaStatus;
  created_at: number;
  from_label: string;
  deleted_at: number | null;
  deleted_by_partner_id: string | null;
  deleted_by_label: string | null;
}

export type PlanMedia = MediaItem;

export interface PlanExpense {
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
  from_label: string;
  paid_by_label: string;
}

export interface CalendarPlanDay {
  plan_id: string;
  title: string;
  start_date: string;
  end_date: string;
  cover_thumbnail_url: string | null;
  date: string;
}

export interface CalendarFeed {
  events: CalendarEvent[];
  plans: CalendarPlanDay[];
}

export interface GiphyGif {
  id: string;
  title: string;
  url: string;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getSessionToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Session-Token": token } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export async function createCouple(name: string) {
  const data = await api<{ sessionToken: string }>("/api/couples/create", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  setSessionToken(data.sessionToken);
  return data;
}

export async function connectWithPartnerCode(code: string, name?: string) {
  const data = await api<{ sessionToken: string; partnerConnected: boolean }>(
    "/api/couples/connect",
    {
      method: "POST",
      body: JSON.stringify({ code, name }),
    },
  );
  setSessionToken(data.sessionToken);
  return data;
}

export async function logout() {
  try {
    await api<{ ok: boolean }>("/api/session/logout", { method: "POST" });
  } finally {
    clearSession();
  }
}

export function fetchMe() {
  return api<MeResponse>("/api/me");
}

export function createQuestion(data: {
  type: QuestionType;
  text: string;
  options?: string[];
}) {
  return api<{ update: Update }>("/api/updates", {
    method: "POST",
    body: JSON.stringify({
      kind: "question",
      type: data.type,
      text: data.text,
      options: data.options,
    }),
  });
}

export function fetchVapidPublicKey() {
  return api<{ publicKey: string }>("/api/push/vapid-public-key");
}

export function fetchAppMeta() {
  return api<{ build: number }>("/api/meta", { cache: "no-store" });
}

export function subscribePush(subscription: PushSubscriptionJSON) {
  return api<{ ok: boolean }>("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify({ subscription }),
  });
}

export function sendLove(message?: string) {
  return api<{ ok: boolean; sent: boolean }>("/api/love", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function shareCapacity(level: number) {
  return api<{ ok: boolean; sent: boolean }>("/api/capacity", {
    method: "POST",
    body: JSON.stringify({ level }),
  });
}

export function fetchUpdates(options?: { limit?: number; before?: number }) {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set("limit", String(options.limit));
  if (options?.before != null) params.set("before", String(options.before));
  const query = params.toString();
  return api<{ updates: Update[]; hasMore: boolean }>(
    `/api/updates${query ? `?${query}` : ""}`,
  );
}

export function createUpdate(text: string) {
  return api<{ update: Update }>("/api/updates", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function respondToUpdate(updateId: string, gifUrl: string) {
  return api<{ response: UpdateResponse }>(
    `/api/updates/${updateId}/respond`,
    {
      method: "POST",
      body: JSON.stringify({ gifUrl }),
    },
  );
}

export function respondToUpdateWithEmoji(updateId: string, emoji: string) {
  return api<{ response: UpdateResponse }>(
    `/api/updates/${updateId}/respond`,
    {
      method: "POST",
      body: JSON.stringify({ emoji }),
    },
  );
}

export function answerQuestion(updateId: string, value: string) {
  return api<{ response: UpdateResponse }>(
    `/api/updates/${updateId}/respond`,
    {
      method: "POST",
      body: JSON.stringify({ value }),
    },
  );
}

export function searchGiphy(query = "", offset = 0) {
  const params = new URLSearchParams({
    offset: String(offset),
  });
  if (query.trim()) {
    params.set("q", query.trim());
  }
  return api<{ gifs: GiphyGif[]; hasMore: boolean }>(
    `/api/giphy/search?${params.toString()}`,
  );
}

export function fetchCalendarEvents(from: string, to: string) {
  const params = new URLSearchParams({ from, to });
  return api<{ events: CalendarEvent[] }>(
    `/api/calendar/events?${params.toString()}`,
  );
}

export function fetchCalendarFeed(from: string, to: string) {
  const params = new URLSearchParams({ from, to });
  return api<CalendarFeed>(`/api/calendar/feed?${params.toString()}`);
}

export function fetchUpcomingEvents() {
  return api<{ events: CalendarEvent[] }>("/api/calendar/events/upcoming");
}

export function createCalendarEvent(data: {
  title: string;
  eventDate: string;
  eventTime?: string;
  notes?: string;
  remindAt?: number;
}) {
  return api<{ event: CalendarEvent }>("/api/calendar/events", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCalendarEvent(
  eventId: string,
  data: {
    title: string;
    eventDate: string;
    eventTime?: string;
    notes?: string;
    remindAt?: number;
  },
) {
  return api<{ event: CalendarEvent }>(`/api/calendar/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteCalendarEvent(eventId: string) {
  return api<{ ok: boolean }>(`/api/calendar/events/${eventId}`, {
    method: "DELETE",
  });
}

export function shareLocation(data: {
  latitude: number;
  longitude: number;
  accuracyM?: number | null;
  label?: string;
}) {
  return api<{ update: Update }>("/api/updates", {
    method: "POST",
    body: JSON.stringify({
      kind: "location",
      ...data,
    }),
  });
}

export function fetchNotes() {
  return api<{ notes: Note[] }>("/api/notes");
}

export function fetchNote(noteId: string) {
  return api<{ note: Note }>(`/api/notes/${noteId}`);
}

export function createNote(data: {
  type: NoteType;
  title?: string;
  body?: string;
  items?: Array<{ id?: string; text: string; done?: boolean }>;
  planId?: string;
}) {
  return api<{ note: Note }>("/api/notes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateNote(
  noteId: string,
  data: {
    type: NoteType;
    title?: string;
    body?: string;
    items?: TodoItem[];
  },
) {
  return api<{ note: Note }>(`/api/notes/${noteId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteNote(noteId: string) {
  return api<{ ok: boolean }>(`/api/notes/${noteId}`, {
    method: "DELETE",
  });
}

export function fetchPlans() {
  return api<{ plans: Plan[] }>("/api/plans");
}

export function fetchPlan(planId: string) {
  return api<{ plan: Plan }>(`/api/plans/${planId}`);
}

export function createPlan(data: {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budgetAmountCents?: number;
  budgetCurrency?: string;
}) {
  return api<{ plan: Plan }>("/api/plans", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updatePlan(
  planId: string,
  data: {
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    budgetAmountCents?: number | null;
    budgetCurrency?: string;
    coverMediaId?: string | null;
  },
) {
  return api<{ plan: Plan }>(`/api/plans/${planId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deletePlan(planId: string) {
  return api<{ ok: boolean }>(`/api/plans/${planId}`, {
    method: "DELETE",
  });
}

export function fetchPlanNotes(planId: string) {
  return api<{ notes: Note[] }>(`/api/plans/${planId}/notes`);
}

export function fetchPlanMedia(planId: string) {
  return api<{ media: PlanMedia[] }>(`/api/plans/${planId}/media`);
}

export function fetchPlanMediaItem(planId: string, mediaId: string) {
  return api<{ media: PlanMedia }>(
    `/api/plans/${planId}/media/${mediaId}`,
  );
}

export async function uploadPlanImage(
  planId: string,
  file: File,
  caption?: string,
) {
  const token = getSessionToken();
  const formData = new FormData();
  formData.append("file", file);
  if (caption) formData.append("caption", caption);

  const res = await fetch(`/api/plans/${planId}/media`, {
    method: "POST",
    headers: token ? { "X-Session-Token": token } : {},
    body: formData,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Upload failed (${res.status})`);
  }

  return res.json() as Promise<{ media: PlanMedia }>;
}

export function createPlanVideoUpload(planId: string, caption?: string) {
  return api<{ media: PlanMedia; uploadURL: string }>(
    `/api/plans/${planId}/media/video`,
    {
      method: "POST",
      body: JSON.stringify({ caption }),
    },
  );
}

export function updatePlanMedia(
  planId: string,
  mediaId: string,
  data: { caption?: string; setCover?: boolean },
) {
  return api<{ media: PlanMedia }>(
    `/api/plans/${planId}/media/${mediaId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export function deletePlanMedia(planId: string, mediaId: string) {
  return api<{ ok: boolean }>(`/api/plans/${planId}/media/${mediaId}`, {
    method: "DELETE",
  });
}

export function fetchCoupleMedia(filter: MediaFilter = "all") {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  const query = params.toString();
  return api<{ media: MediaItem[] }>(`/api/media${query ? `?${query}` : ""}`);
}

export function fetchMediaItem(mediaId: string) {
  return api<{ media: MediaItem }>(`/api/media/${mediaId}`);
}

export async function uploadLibraryImage(file: File, caption?: string) {
  const token = getSessionToken();
  const formData = new FormData();
  formData.append("file", file);
  if (caption) formData.append("caption", caption);

  const res = await fetch("/api/media", {
    method: "POST",
    headers: token ? { "X-Session-Token": token } : {},
    body: formData,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Upload failed (${res.status})`);
  }

  return res.json() as Promise<{ media: MediaItem }>;
}

export function createLibraryVideoUpload(caption?: string) {
  return api<{ media: MediaItem; uploadURL: string }>("/api/media/video", {
    method: "POST",
    body: JSON.stringify({ caption }),
  });
}

export function deleteMedia(mediaId: string) {
  return api<{ ok: boolean }>(`/api/media/${mediaId}`, {
    method: "DELETE",
  });
}

export async function uploadUpdateImage(file: File) {
  const token = getSessionToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/updates/media", {
    method: "POST",
    headers: token ? { "X-Session-Token": token } : {},
    body: formData,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Upload failed (${res.status})`);
  }

  return res.json() as Promise<{ update: Update }>;
}

export function createUpdateVideoUpload() {
  return api<{ update: Update; uploadURL: string }>("/api/updates/media/video", {
    method: "POST",
  });
}

export async function uploadVideoToStream(
  uploadURL: string,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  const uploadRes = await fetch(uploadURL, {
    method: "POST",
    body: formData,
  });
  if (!uploadRes.ok) {
    throw new Error(`Video upload failed (${uploadRes.status})`);
  }
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

export function fetchPlanExpenses(planId: string) {
  return api<{ expenses: PlanExpense[]; spentCents: number }>(
    `/api/plans/${planId}/expenses`,
  );
}

export function createPlanExpense(
  planId: string,
  data: {
    label: string;
    amountCents: number;
    paidByPartnerId: string;
    category?: string;
    expenseDate?: string;
  },
) {
  return api<{ expense: PlanExpense }>(`/api/plans/${planId}/expenses`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updatePlanExpense(
  planId: string,
  expenseId: string,
  data: {
    label: string;
    amountCents: number;
    paidByPartnerId: string;
    category?: string;
    expenseDate?: string;
  },
) {
  return api<{ expense: PlanExpense }>(
    `/api/plans/${planId}/expenses/${expenseId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export function deletePlanExpense(planId: string, expenseId: string) {
  return api<{ ok: boolean }>(
    `/api/plans/${planId}/expenses/${expenseId}`,
    { method: "DELETE" },
  );
}


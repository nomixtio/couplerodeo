import { clearSession, getSessionToken, setSessionToken } from "./partner";

export type QuestionType = "choice" | "scale" | "gif";
export type NewQuestionType = "choice" | "scale";

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

export interface Answer {
  id: string;
  question_id: string;
  partner_id: string;
  value: string;
  created_at: number;
}

export interface Question {
  id: string;
  couple_id: string;
  from_partner_id: string;
  type: QuestionType;
  text: string;
  options_json: string | null;
  created_at: number;
  from_label: string;
  answer: Answer | null;
  answer_label: string | null;
}

export interface UpdateResponse {
  id: string;
  statement_id: string;
  partner_id: string;
  gif_url: string;
  created_at: number;
  responder_label: string;
}

export interface Update {
  id: string;
  couple_id: string;
  from_partner_id: string;
  text: string;
  created_at: number;
  from_label: string;
  response: UpdateResponse | null;
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

export function fetchQuestions() {
  return api<{ questions: Question[] }>("/api/questions");
}

export function fetchQuestion(id: string) {
  return api<{ question: Question }>(`/api/questions/${id}`);
}

export function createQuestion(data: {
  type: NewQuestionType;
  text: string;
  options?: string[];
}) {
  return api<{ question: Question }>("/api/questions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function submitAnswer(questionId: string, value: string) {
  return api<{ answer: Answer }>(`/api/questions/${questionId}/answer`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

export function fetchVapidPublicKey() {
  return api<{ publicKey: string }>("/api/push/vapid-public-key");
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

export function fetchUpdates() {
  return api<{ updates: Update[] }>("/api/updates");
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

export function searchGiphy(query: string, offset = 0) {
  const params = new URLSearchParams({
    q: query,
    offset: String(offset),
  });
  return api<{ gifs: GiphyGif[] }>(`/api/giphy/search?${params.toString()}`);
}

export function parseOptions(optionsJson: string | null): string[] {
  if (!optionsJson) return [];
  try {
    const parsed = JSON.parse(optionsJson) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

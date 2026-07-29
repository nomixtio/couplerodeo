import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  createAnswer,
  clearPushSubscription,
  createCouple,
  createQuestion,
  createUpdate,
  createUpdateResponse,
  connectWithPartnerCode,
  deleteSession,
  getOtherPartner,
  getPartner,
  getPartnersByCoupleId,
  getQuestionById,
  getQuestions,
  getSessionPartner,
  getUpdateById,
  getUpdates,
  savePushSubscription,
  sanitizePartners,
  touchSession,
  updatePartnerCapacity,
  partnerCapacitySnapshot,
  type Partner,
  type QuestionType,
} from "./db";
import { sendPushToPartner } from "./push";
import { normalizeLoveMessage } from "./love";
import { formatCapacityForPush, normalizeCapacityLevel } from "./capacity";
import { searchGiphy } from "./giphy";
import { isValidGiphyUrl, normalizeUpdateText } from "./updates";
import { APP_SLUG } from "../shared/app";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  GIPHY_API_KEY: string;
}

type AppVariables = {
  partner: Partner;
  partnerId: string;
  coupleId: string;
  sessionToken: string;
};

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const SESSION_HEADER = "X-Session-Token";

app.use("/api/*", cors());

async function requireSession(c: {
  env: Env;
  req: { header: (name: string) => string | undefined };
  set: (key: string, value: unknown) => void;
}) {
  const sessionToken = c.req.header(SESSION_HEADER);
  if (!sessionToken) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const partner = await getSessionPartner(c.env.DB, sessionToken);
  if (!partner) {
    return { error: "Invalid session", status: 401 as const };
  }

  await touchSession(c.env.DB, sessionToken);
  c.set("partner", partner);
  c.set("partnerId", partner.id);
  c.set("coupleId", partner.couple_id);
  c.set("sessionToken", sessionToken);
  return null;
}

app.post("/api/couples/create", async (c) => {
  const body = await c.req.json<{ name?: string }>();
  if (!body.name?.trim()) {
    return c.json({ error: "Name is required" }, 400);
  }

  const result = await createCouple(c.env.DB, body.name);
  if ("error" in result) {
    return c.json({ error: "Name must be 1–30 characters" }, 400);
  }

  return c.json({ sessionToken: result.sessionToken }, 201);
});

app.post("/api/couples/connect", async (c) => {
  const body = await c.req.json<{ code?: string; name?: string }>();
  if (!body.code?.trim()) {
    return c.json({ error: "Code is required" }, 400);
  }

  const result = await connectWithPartnerCode(c.env.DB, body.code, body.name);
  if ("error" in result) {
    if (result.error === "not_found") {
      return c.json({ error: "Invalid code" }, 404);
    }
    if (result.error === "invalid_name") {
      return c.json({ error: "Name must be 1–30 characters" }, 400);
    }
    return c.json(
      { error: "Enter your partner's code — not your own personal code" },
      400,
    );
  }

  return c.json(
    { sessionToken: result.sessionToken, partnerConnected: result.partnerConnected },
    201,
  );
});

app.post("/api/session/logout", async (c) => {
  const sessionToken = c.req.header(SESSION_HEADER);
  if (sessionToken) {
    await deleteSession(c.env.DB, sessionToken);
  }
  return c.json({ ok: true });
});

app.get("/api/me", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const partner = c.get("partner");
  const partners = await getPartnersByCoupleId(c.env.DB, c.get("coupleId"));
  const myCode = partner.recovery_code;
  const otherPartner = partners.find((p) => p.id !== partner.id);

  return c.json({
    coupleId: c.get("coupleId"),
    myCode,
    myName: partner.label,
    partnerName: otherPartner?.label ?? null,
    shareCode: partner.slot === 0 ? myCode : null,
    partnerId: c.get("partnerId"),
    partnerConnected: partners.length >= 2,
    partners: sanitizePartners(partners),
    myCapacity: partnerCapacitySnapshot(partner),
    partnerCapacity: otherPartner
      ? partnerCapacitySnapshot(otherPartner)
      : { level: null, updatedAt: null },
  });
});

app.get("/api/questions", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const questions = await getQuestions(c.env.DB, c.get("coupleId"));
  return c.json({ questions });
});

app.get("/api/questions/:id", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const question = await getQuestionById(
    c.env.DB,
    c.req.param("id"),
    c.get("coupleId"),
  );
  if (!question) return c.json({ error: "Not found" }, 404);
  return c.json({ question });
});

app.post("/api/questions", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const body = await c.req.json<{
    type: QuestionType;
    text: string;
    options?: string[];
  }>();

  if (!body.type || !body.text?.trim()) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  if (body.type === "choice" && (!body.options || body.options.length < 2)) {
    return c.json({ error: "Choice questions need at least 2 options" }, 400);
  }

  if (body.type !== "choice" && body.type !== "scale") {
    return c.json({ error: "Invalid question type" }, 400);
  }

  const partnerId = c.get("partnerId");
  const id = crypto.randomUUID();
  const question = await createQuestion(c.env.DB, {
    id,
    coupleId: c.get("coupleId"),
    fromPartnerId: partnerId,
    type: body.type,
    text: body.text.trim(),
    options: body.options,
  });

  const asker = c.get("partner");
  const otherPartner = await getOtherPartner(
    c.env.DB,
    c.get("coupleId"),
    partnerId,
  );
  if (otherPartner) {
    const origin = new URL(c.req.url).origin;
    const pushResult = await sendPushToPartner(
      otherPartner,
      c.env.VAPID_PRIVATE_KEY,
      {
        title: `New question from ${asker.label}`,
        body: body.text.trim(),
        url: `/answer/${id}`,
        tag: `${APP_SLUG}-question-${id}`,
      },
      origin,
    );
    if (!pushResult.sent) {
      console.warn(
        "Question push not delivered:",
        pushResult.error ?? pushResult.status,
      );
    }
  }

  return c.json({ question }, 201);
});

app.post("/api/questions/:id/answer", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const questionId = c.req.param("id");
  const body = await c.req.json<{ value: string }>();
  const partnerId = c.get("partnerId");

  if (body.value == null || body.value === "") {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const question = await getQuestionById(
    c.env.DB,
    questionId,
    c.get("coupleId"),
  );
  if (!question) return c.json({ error: "Not found" }, 404);
  if (question.answer) return c.json({ error: "Already answered" }, 409);
  if (question.from_partner_id === partnerId) {
    return c.json({ error: "Cannot answer your own question" }, 400);
  }

  const answer = await createAnswer(c.env.DB, {
    id: crypto.randomUUID(),
    questionId,
    partnerId,
    value: body.value,
  });

  const answerer = c.get("partner");
  const asker = await getPartner(c.env.DB, question.from_partner_id);
  if (asker) {
    const origin = new URL(c.req.url).origin;
    const pushResult = await sendPushToPartner(
      asker,
      c.env.VAPID_PRIVATE_KEY,
      {
        title: `${answerer.label} answered`,
        body: question.text,
        url: "/questions?tab=answers",
        tag: `${APP_SLUG}-answer-${questionId}`,
      },
      origin,
    );
    if (!pushResult.sent) {
      console.warn(
        "Answer push not delivered:",
        pushResult.error ?? pushResult.status,
      );
    }
  }

  return c.json({ answer }, 201);
});

app.post("/api/push/subscribe", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const body = await c.req.json<{ subscription: PushSubscriptionJSON }>();
  if (!body.subscription) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  await savePushSubscription(
    c.env.DB,
    c.get("partnerId"),
    JSON.stringify(body.subscription),
  );

  return c.json({ ok: true });
});

app.get("/api/push/vapid-public-key", (c) => {
  return c.json({ publicKey: c.env.VAPID_PUBLIC_KEY });
});

app.post("/api/push/reset", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  await clearPushSubscription(c.env.DB, c.get("partnerId"));
  return c.json({ ok: true });
});

app.post("/api/love", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const body = await c.req.json<{ message?: string }>();
  const message = normalizeLoveMessage(body.message);
  const sender = c.get("partner");
  const partners = await getPartnersByCoupleId(c.env.DB, c.get("coupleId"));

  if (partners.length < 2) {
    return c.json({ error: "Partner not connected yet" }, 400);
  }

  const otherPartner = await getOtherPartner(
    c.env.DB,
    c.get("coupleId"),
    c.get("partnerId"),
  );
  if (!otherPartner) {
    return c.json({ error: "Partner not found" }, 404);
  }

  const origin = new URL(c.req.url).origin;
  const pushResult = await sendPushToPartner(
    otherPartner,
    c.env.VAPID_PRIVATE_KEY,
    {
      title: `❤️ ${sender.label}`,
      body: message || "Sent you love!",
      url: "/",
      tag: `${APP_SLUG}-love-${Date.now()}`,
    },
    origin,
  );

  return c.json({ ok: true, sent: pushResult.sent });
});

app.post("/api/capacity", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const body = await c.req.json<{ level?: unknown }>();
  const level = normalizeCapacityLevel(body.level);
  if (level === null) {
    return c.json({ error: "Level must be an integer from 0 to 100" }, 400);
  }

  const sender = c.get("partner");
  const partners = await getPartnersByCoupleId(c.env.DB, c.get("coupleId"));

  if (partners.length < 2) {
    return c.json({ error: "Partner not connected yet" }, 400);
  }

  const otherPartner = await getOtherPartner(
    c.env.DB,
    c.get("coupleId"),
    c.get("partnerId"),
  );
  if (!otherPartner) {
    return c.json({ error: "Partner not found" }, 404);
  }

  await updatePartnerCapacity(c.env.DB, c.get("partnerId"), level);

  const { title, body: pushBody } = formatCapacityForPush(sender.label, level);
  const origin = new URL(c.req.url).origin;
  const pushResult = await sendPushToPartner(
    otherPartner,
    c.env.VAPID_PRIVATE_KEY,
    {
      title,
      body: pushBody,
      url: "/",
      tag: `${APP_SLUG}-capacity-${sender.id}`,
    },
    origin,
  );

  return c.json({ ok: true, sent: pushResult.sent });
});

app.get("/api/updates", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const updates = await getUpdates(c.env.DB, c.get("coupleId"));
  return c.json({ updates });
});

app.post("/api/updates", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const body = await c.req.json<{ text?: string }>();
  const text = normalizeUpdateText(body.text);
  if (!text) {
    return c.json(
      { error: "Update must be 1–200 characters" },
      400,
    );
  }

  const partnerId = c.get("partnerId");
  const id = crypto.randomUUID();
  const update = await createUpdate(c.env.DB, {
    id,
    coupleId: c.get("coupleId"),
    fromPartnerId: partnerId,
    text,
  });

  const sender = c.get("partner");
  const otherPartner = await getOtherPartner(
    c.env.DB,
    c.get("coupleId"),
    partnerId,
  );
  if (otherPartner) {
    const origin = new URL(c.req.url).origin;
    const pushResult = await sendPushToPartner(
      otherPartner,
      c.env.VAPID_PRIVATE_KEY,
      {
        title: `Update from ${sender.label}`,
        body: text,
        url: "/updates?tab=received",
        tag: `${APP_SLUG}-update-${id}`,
      },
      origin,
    );
    if (!pushResult.sent) {
      console.warn(
        "Update push not delivered:",
        pushResult.error ?? pushResult.status,
      );
    }
  }

  return c.json({ update }, 201);
});

app.post("/api/updates/:id/respond", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const updateId = c.req.param("id");
  const body = await c.req.json<{ gifUrl?: string }>();
  const partnerId = c.get("partnerId");

  if (!body.gifUrl?.trim()) {
    return c.json({ error: "Missing required fields" }, 400);
  }
  if (!isValidGiphyUrl(body.gifUrl.trim())) {
    return c.json({ error: "Invalid GIF URL" }, 400);
  }

  const update = await getUpdateById(
    c.env.DB,
    updateId,
    c.get("coupleId"),
  );
  if (!update) return c.json({ error: "Not found" }, 404);
  if (update.response) return c.json({ error: "Already responded" }, 409);
  if (update.from_partner_id === partnerId) {
    return c.json({ error: "Cannot respond to your own update" }, 400);
  }

  const response = await createUpdateResponse(c.env.DB, {
    id: crypto.randomUUID(),
    updateId,
    partnerId,
    gifUrl: body.gifUrl.trim(),
  });

  const responder = c.get("partner");
  const sender = await getPartner(c.env.DB, update.from_partner_id);
  if (sender) {
    const origin = new URL(c.req.url).origin;
    const pushResult = await sendPushToPartner(
      sender,
      c.env.VAPID_PRIVATE_KEY,
      {
        title: `${responder.label} reacted`,
        body: update.text,
        url: "/updates?tab=send",
        tag: `${APP_SLUG}-update-response-${updateId}`,
      },
      origin,
    );
    if (!pushResult.sent) {
      console.warn(
        "Update response push not delivered:",
        pushResult.error ?? pushResult.status,
      );
    }
  }

  return c.json({ response }, 201);
});

app.get("/api/giphy/search", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const query = c.req.query("q") ?? "love";
  const offset = Number(c.req.query("offset") ?? "0");

  try {
    const gifs = await searchGiphy(
      c.env.GIPHY_API_KEY,
      query,
      Number.isFinite(offset) ? offset : 0,
    );
    return c.json({ gifs });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not search Giphy";
    return c.json({ error: message }, 502);
  }
});

app.post("/api/push/test", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const partner = c.get("partner");
  const origin = new URL(c.req.url).origin;
  const result = await sendPushToPartner(
    partner,
    c.env.VAPID_PRIVATE_KEY,
    {
      title: "Test notification",
      body: "If you see this, notifications are working!",
      url: "/questions?tab=answers",
      tag: `${APP_SLUG}-test-${Date.now()}`,
    },
    origin,
  );

  return c.json(result, result.sent ? 200 : 502);
});

export default app;

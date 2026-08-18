import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  clearPushSubscription,
  createCalendarEvent,
  createCouple,
  createNote,
  createPlan,
  createPlanExpense,
  createPlanMedia,
  createUpdate,
  createUpdateResponse,
  connectWithPartnerCode,
  clearPlanCoverIfMedia,
  countPlanMediaByType,
  deleteCalendarEvent,
  deleteNote,
  deletePlan,
  deletePlanExpense,
  deletePlanMedia,
  deleteSession,
  getCalendarEventById,
  getCalendarEventsInRange,
  getNoteById,
  getOtherPartner,
  getPartner,
  getPartnersByCoupleId,
  getPlanById,
  getPlanExpenseById,
  getPlanMediaById,
  getPlanMediaForCleanup,
  getPlansInDateRange,
  getSessionPartner,
  getUpcomingCalendarEvents,
  getUpdateById,
  getUpdates,
  listNotes,
  listPlanExpenses,
  listPlanMedia,
  listPlanNotes,
  listPlans,
  savePushSubscription,
  sanitizePartners,
  touchSession,
  updateCalendarEvent,
  updateNote,
  updatePlan,
  updatePlanExpense,
  updatePlanMedia,
  updatePartnerCapacity,
  partnerCapacitySnapshot,
  type Partner,
} from "./db";
import { sendPushToPartner } from "./push";
import { normalizeLoveMessage } from "./love";
import { formatCapacityForPush, normalizeCapacityLevel, serializeCapacityLevel } from "./capacity";
import { searchGiphy, trendingGiphy } from "./giphy";
import { isGiphyUrl, normalizeUpdateText } from "./updates";
import { parseCalendarEventBody } from "./calendar";
import {
  createLocationShare,
  deleteLocationSharesForPartner,
  getLatestLocationShares,
  isLocationShareRateLimited,
  parseLocationShareBody,
} from "./location";
import { handleScheduledReminders } from "./reminders";
import { normalizeAnswerValue } from "./questions";
import {
  isQuestionType,
  normalizeQuestionText,
  serializeQuestionPayload,
} from "../shared/questions";
import {
  findNewlyCompletedItems,
  mergeTodoItems,
  parseNoteBody,
  serializeTodoItems,
} from "./notes";
import { parsePlanBody, parsePlanExpenseBody } from "./plans";
import {
  countMediaLimits,
  deleteHostedImage,
  deleteStreamVideo,
  normalizeMediaCaption,
  type ImagesBinding,
  type StreamBinding,
} from "./plan-media";
import {
  CALENDAR_UPCOMING_LIMIT,
  formatCalendarEventWhen,
  todayDateString,
} from "../shared/calendar";
import {
  expandPlansForCalendar,
  formatPlanDateRange,
  IMAGE_VARIANT_PUBLIC,
  IMAGE_VARIANT_THUMBNAIL,
  normalizePlanImageMedia,
  pickImageVariantUrl,
} from "../shared/plans";
import { APP_SLUG } from "../shared/app";
import versionData from "../src/app-version.json";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  IMAGES: ImagesBinding;
  STREAM: StreamBinding;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  GIPHY_API_KEY: string;
  PUBLIC_ORIGIN?: string;
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

app.all("/assets/*", async (c) => {
  const asset = await c.env.ASSETS.fetch(c.req.raw);
  const pathname = new URL(c.req.url).pathname;
  const contentType = asset.headers.get("content-type") ?? "";
  const spaFallbackForFile =
    contentType.includes("text/html") &&
    /\.(?:js|mjs|cjs|css)$/i.test(pathname);

  if (!spaFallbackForFile) {
    return asset;
  }

  if (/\.(?:js|mjs|cjs)$/i.test(pathname)) {
    const script = `(() => { try { const k = ${JSON.stringify(`${APP_SLUG}-stale-asset-reload`)}; const last = Number(sessionStorage.getItem(k) || 0); if (Date.now() - last < 15000) return; sessionStorage.setItem(k, String(Date.now())); } catch (e) {} location.replace("/?v=" + Date.now()); })();`;
    return c.body(script, 200, {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-store",
    });
  }

  return c.body("", 404, { "cache-control": "no-store" });
});

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

app.get("/api/meta", (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({ build: versionData.build });
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

  const update = await createUpdate(c.env.DB, {
    id: crypto.randomUUID(),
    coupleId: c.get("coupleId"),
    fromPartnerId: c.get("partnerId"),
    text: message,
    kind: "love",
  });

  const origin = new URL(c.req.url).origin;
  const pushResult = await sendPushToPartner(
    otherPartner,
    c.env.VAPID_PRIVATE_KEY,
    {
      title: `❤️ ${sender.label}`,
      body: message || "Sent you love!",
      url: "/updates?tab=all",
      tag: `${APP_SLUG}-love-${update.id}`,
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

  const update = await createUpdate(c.env.DB, {
    id: crypto.randomUUID(),
    coupleId: c.get("coupleId"),
    fromPartnerId: c.get("partnerId"),
    text: serializeCapacityLevel(level),
    kind: "capacity",
  });

  const { title, body: pushBody } = formatCapacityForPush(sender.label, level);
  const origin = new URL(c.req.url).origin;
  const pushResult = await sendPushToPartner(
    otherPartner,
    c.env.VAPID_PRIVATE_KEY,
    {
      title,
      body: pushBody,
      url: "/updates?tab=all",
      tag: `${APP_SLUG}-capacity-${update.id}`,
    },
    origin,
  );

  return c.json({ ok: true, sent: pushResult.sent });
});

app.get("/api/updates", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const beforeRaw = c.req.query("before");
  const limitRaw = c.req.query("limit");
  const before =
    beforeRaw != null && beforeRaw !== "" ? Number(beforeRaw) : undefined;
  const limit =
    limitRaw != null && limitRaw !== "" ? Number(limitRaw) : undefined;

  const result = await getUpdates(c.env.DB, c.get("coupleId"), {
    before: Number.isFinite(before) ? before : undefined,
    limit: Number.isFinite(limit) ? limit : undefined,
  });
  return c.json(result);
});

app.post("/api/updates", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const body = await c.req.json<{
    text?: string;
    kind?: string;
    type?: string;
    options?: string[];
  }>();

  const partnerId = c.get("partnerId");
  const id = crypto.randomUUID();
  const sender = c.get("partner");
  const otherPartner = await getOtherPartner(
    c.env.DB,
    c.get("coupleId"),
    partnerId,
  );
  const origin = new URL(c.req.url).origin;

  if (body.kind === "question") {
    if (!isQuestionType(body.type)) {
      return c.json({ error: "Invalid question type" }, 400);
    }

    const text = normalizeQuestionText(body.text);
    if (!text) {
      return c.json({ error: "Question must be 1–200 characters" }, 400);
    }

    const options =
      body.type === "choice"
        ? (body.options ?? []).map((option) => option.trim()).filter(Boolean)
        : [];
    if (body.type === "choice" && options.length < 2) {
      return c.json({ error: "Choice questions need at least 2 options" }, 400);
    }

    const update = await createUpdate(c.env.DB, {
      id,
      coupleId: c.get("coupleId"),
      fromPartnerId: partnerId,
      text,
      kind: "question",
      payloadJson: serializeQuestionPayload({
        type: body.type,
        options: body.type === "choice" ? options : null,
      }),
    });

    if (otherPartner) {
      const pushResult = await sendPushToPartner(
        otherPartner,
        c.env.VAPID_PRIVATE_KEY,
        {
          title: `New question from ${sender.label}`,
          body: text,
          url: "/updates",
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

    return c.json({ update }, 201);
  }

  const text = normalizeUpdateText(body.text);
  if (!text) {
    return c.json(
      { error: "Update must be 1–200 characters" },
      400,
    );
  }

  const update = await createUpdate(c.env.DB, {
    id,
    coupleId: c.get("coupleId"),
    fromPartnerId: partnerId,
    text,
  });

  if (otherPartner) {
    const pushResult = await sendPushToPartner(
      otherPartner,
      c.env.VAPID_PRIVATE_KEY,
      {
        title: `Update from ${sender.label}`,
        body: text,
        url: "/updates",
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
  const body = await c.req.json<{ gifUrl?: string; value?: string }>();
  const partnerId = c.get("partnerId");

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

  if (update.kind === "question") {
    if (!update.question) {
      return c.json({ error: "Invalid question" }, 400);
    }
    if (body.value == null || body.value === "") {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const parsed = normalizeAnswerValue(
      update.question.type,
      body.value,
      update.question.options ? JSON.stringify(update.question.options) : null,
    );
    if (!parsed.ok) return c.json({ error: parsed.error }, 400);

    const response = await createUpdateResponse(c.env.DB, {
      id: crypto.randomUUID(),
      updateId,
      partnerId,
      kind: "answer",
      value: parsed.value,
    });

    const responder = c.get("partner");
    const sender = await getPartner(c.env.DB, update.from_partner_id);
    if (sender) {
      const origin = new URL(c.req.url).origin;
      const pushResult = await sendPushToPartner(
        sender,
        c.env.VAPID_PRIVATE_KEY,
        {
          title: `${responder.label} answered`,
          body: update.text,
          url: "/updates",
          tag: `${APP_SLUG}-question-answer-${updateId}`,
        },
        origin,
      );
      if (!pushResult.sent) {
        console.warn(
          "Question answer push not delivered:",
          pushResult.error ?? pushResult.status,
        );
      }
    }

    return c.json({ response }, 201);
  }

  if (!body.gifUrl?.trim()) {
    return c.json({ error: "Missing required fields" }, 400);
  }
  if (!isGiphyUrl(body.gifUrl.trim())) {
    return c.json({ error: "Invalid GIF URL" }, 400);
  }

  const response = await createUpdateResponse(c.env.DB, {
    id: crypto.randomUUID(),
    updateId,
    partnerId,
    kind: "gif",
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
        url: "/updates",
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

  const query = c.req.query("q")?.trim() ?? "";
  const offset = Number(c.req.query("offset") ?? "0");

  try {
    const gifs = query
      ? await searchGiphy(
          c.env.GIPHY_API_KEY,
          query,
          Number.isFinite(offset) ? offset : 0,
        )
      : await trendingGiphy(
          c.env.GIPHY_API_KEY,
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
      url: "/updates",
      tag: `${APP_SLUG}-test-${Date.now()}`,
    },
    origin,
  );

  return c.json(result, result.sent ? 200 : 502);
});

app.get("/api/calendar/events", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const from = c.req.query("from");
  const to = c.req.query("to");
  if (!from || !to) {
    return c.json({ error: "from and to query params are required" }, 400);
  }

  const events = await getCalendarEventsInRange(
    c.env.DB,
    c.get("coupleId"),
    from,
    to,
  );
  return c.json({ events });
});

app.get("/api/calendar/feed", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const from = c.req.query("from");
  const to = c.req.query("to");
  if (!from || !to) {
    return c.json({ error: "from and to query params are required" }, 400);
  }

  const coupleId = c.get("coupleId");
  const [events, plans] = await Promise.all([
    getCalendarEventsInRange(c.env.DB, coupleId, from, to),
    getPlansInDateRange(c.env.DB, coupleId, from, to),
  ]);

  const planDays = expandPlansForCalendar(
    plans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      start_date: plan.start_date,
      end_date: plan.end_date,
      cover_thumbnail_url: plan.cover_thumbnail_url,
    })),
    from,
    to,
  );

  return c.json({ events, plans: planDays });
});

app.get("/api/calendar/events/upcoming", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const events = await getUpcomingCalendarEvents(
    c.env.DB,
    c.get("coupleId"),
    todayDateString(),
    CALENDAR_UPCOMING_LIMIT,
  );
  return c.json({ events });
});

app.post("/api/calendar/events", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const body = await c.req.json<{
    title?: unknown;
    eventDate?: unknown;
    eventTime?: unknown;
    notes?: unknown;
    remindAt?: unknown;
  }>();
  const parsed = parseCalendarEventBody(body);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const partnerId = c.get("partnerId");
  const id = crypto.randomUUID();
  const event = await createCalendarEvent(c.env.DB, {
    id,
    coupleId: c.get("coupleId"),
    fromPartnerId: partnerId,
    title: parsed.data.title,
    eventDate: parsed.data.eventDate,
    eventTime: parsed.data.eventTime,
    notes: parsed.data.notes,
    remindAt: parsed.data.remindAt,
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
        title: `${sender.label} added an event`,
        body: formatCalendarEventWhen(
          parsed.data.eventDate,
          parsed.data.eventTime,
        ),
        url: "/calendar?tab=upcoming",
        tag: `${APP_SLUG}-calendar-${id}`,
      },
      origin,
    );
    if (!pushResult.sent) {
      console.warn(
        "Calendar event push not delivered:",
        pushResult.error ?? pushResult.status,
      );
    }
  }

  return c.json({ event }, 201);
});

app.patch("/api/calendar/events/:id", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const eventId = c.req.param("id");
  const existing = await getCalendarEventById(
    c.env.DB,
    eventId,
    c.get("coupleId"),
  );
  if (!existing) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{
    title?: unknown;
    eventDate?: unknown;
    eventTime?: unknown;
    notes?: unknown;
    remindAt?: unknown;
  }>();
  const parsed = parseCalendarEventBody(body);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const remindAtChanged = existing.remind_at !== parsed.data.remindAt;
  const event = await updateCalendarEvent(c.env.DB, eventId, c.get("coupleId"), {
    title: parsed.data.title,
    eventDate: parsed.data.eventDate,
    eventTime: parsed.data.eventTime,
    notes: parsed.data.notes,
    remindAt: parsed.data.remindAt,
    resetReminderSent: remindAtChanged,
  });
  if (!event) return c.json({ error: "Not found" }, 404);

  const editor = c.get("partner");
  const otherPartner = await getOtherPartner(
    c.env.DB,
    c.get("coupleId"),
    c.get("partnerId"),
  );
  if (otherPartner) {
    const origin = new URL(c.req.url).origin;
    const pushResult = await sendPushToPartner(
      otherPartner,
      c.env.VAPID_PRIVATE_KEY,
      {
        title: `${editor.label} updated an event`,
        body: formatCalendarEventWhen(
          parsed.data.eventDate,
          parsed.data.eventTime,
        ),
        url: "/calendar?tab=upcoming",
        tag: `${APP_SLUG}-calendar-edit-${eventId}`,
      },
      origin,
    );
    if (!pushResult.sent) {
      console.warn(
        "Calendar edit push not delivered:",
        pushResult.error ?? pushResult.status,
      );
    }
  }

  return c.json({ event });
});

app.delete("/api/calendar/events/:id", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const eventId = c.req.param("id");
  const existing = await getCalendarEventById(
    c.env.DB,
    eventId,
    c.get("coupleId"),
  );
  if (!existing) return c.json({ error: "Not found" }, 404);

  await deleteCalendarEvent(c.env.DB, eventId, c.get("coupleId"));

  const deleter = c.get("partner");
  const otherPartner = await getOtherPartner(
    c.env.DB,
    c.get("coupleId"),
    c.get("partnerId"),
  );
  if (otherPartner) {
    const origin = new URL(c.req.url).origin;
    const pushResult = await sendPushToPartner(
      otherPartner,
      c.env.VAPID_PRIVATE_KEY,
      {
        title: `${deleter.label} removed an event`,
        body: existing.title,
        url: "/calendar?tab=upcoming",
        tag: `${APP_SLUG}-calendar-delete-${eventId}`,
      },
      origin,
    );
    if (!pushResult.sent) {
      console.warn(
        "Calendar delete push not delivered:",
        pushResult.error ?? pushResult.status,
      );
    }
  }

  return c.json({ ok: true });
});

app.get("/api/plans", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const plans = await listPlans(c.env.DB, c.get("coupleId"));
  return c.json({ plans });
});

app.get("/api/plans/:id", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const plan = await getPlanById(c.env.DB, c.req.param("id"), c.get("coupleId"));
  if (!plan) return c.json({ error: "Not found" }, 404);
  return c.json({ plan });
});

app.post("/api/plans", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const body = await c.req.json<{
    title?: unknown;
    description?: unknown;
    startDate?: unknown;
    endDate?: unknown;
    budgetAmountCents?: unknown;
    budgetCurrency?: unknown;
  }>();
  const parsed = parsePlanBody(body);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const partnerId = c.get("partnerId");
  const id = crypto.randomUUID();
  const plan = await createPlan(c.env.DB, {
    id,
    coupleId: c.get("coupleId"),
    fromPartnerId: partnerId,
    title: parsed.data.title,
    description: parsed.data.description,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    budgetAmountCents: parsed.data.budgetAmountCents,
    budgetCurrency: parsed.data.budgetCurrency,
  });

  const sender = c.get("partner");
  const otherPartner = await getOtherPartner(
    c.env.DB,
    c.get("coupleId"),
    partnerId,
  );
  if (otherPartner) {
    const origin = new URL(c.req.url).origin;
    const dateLabel = formatPlanDateRange(
      parsed.data.startDate,
      parsed.data.endDate,
    );
    const pushResult = await sendPushToPartner(
      otherPartner,
      c.env.VAPID_PRIVATE_KEY,
      {
        title: `${sender.label} created a plan`,
        body: dateLabel ? `${parsed.data.title} · ${dateLabel}` : parsed.data.title,
        url: `/plans/${id}`,
        tag: `${APP_SLUG}-plan-${id}`,
      },
      origin,
    );
    if (!pushResult.sent) {
      console.warn(
        "Plan create push not delivered:",
        pushResult.error ?? pushResult.status,
      );
    }
  }

  return c.json({ plan }, 201);
});

app.patch("/api/plans/:id", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const planId = c.req.param("id");
  const existing = await getPlanById(c.env.DB, planId, c.get("coupleId"));
  if (!existing) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{
    title?: unknown;
    description?: unknown;
    startDate?: unknown;
    endDate?: unknown;
    budgetAmountCents?: unknown;
    budgetCurrency?: unknown;
    coverMediaId?: unknown;
  }>();
  const parsed = parsePlanBody(body);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  let coverMediaId: string | null | undefined = undefined;
  if (body.coverMediaId !== undefined) {
    if (body.coverMediaId === null || body.coverMediaId === "") {
      coverMediaId = null;
    } else if (typeof body.coverMediaId === "string") {
      const media = await getPlanMediaById(
        c.env.DB,
        body.coverMediaId,
        planId,
        c.get("coupleId"),
      );
      if (!media) return c.json({ error: "Cover media not found" }, 400);
      coverMediaId = media.id;
    } else {
      return c.json({ error: "Invalid cover media" }, 400);
    }
  }

  const plan = await updatePlan(c.env.DB, planId, c.get("coupleId"), {
    title: parsed.data.title,
    description: parsed.data.description,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    budgetAmountCents: parsed.data.budgetAmountCents,
    budgetCurrency: parsed.data.budgetCurrency,
    coverMediaId,
  });

  const sender = c.get("partner");
  const otherPartner = await getOtherPartner(
    c.env.DB,
    c.get("coupleId"),
    c.get("partnerId"),
  );
  if (otherPartner && plan) {
    const origin = new URL(c.req.url).origin;
    const pushResult = await sendPushToPartner(
      otherPartner,
      c.env.VAPID_PRIVATE_KEY,
      {
        title: `${sender.label} updated a plan`,
        body: plan.title,
        url: `/plans/${planId}`,
        tag: `${APP_SLUG}-plan-${planId}`,
      },
      origin,
    );
    if (!pushResult.sent) {
      console.warn(
        "Plan update push not delivered:",
        pushResult.error ?? pushResult.status,
      );
    }
  }

  return c.json({ plan });
});

app.delete("/api/plans/:id", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const planId = c.req.param("id");
  const existing = await getPlanById(c.env.DB, planId, c.get("coupleId"));
  if (!existing) return c.json({ error: "Not found" }, 404);

  const mediaRows = await getPlanMediaForCleanup(
    c.env.DB,
    planId,
    c.get("coupleId"),
  );
  for (const media of mediaRows) {
    if (media.type === "image") {
      await deleteHostedImage(c.env.IMAGES, media.cf_image_id);
    } else {
      await deleteStreamVideo(c.env.STREAM, media.cf_stream_id);
    }
  }

  await deletePlan(c.env.DB, planId, c.get("coupleId"));

  const deleter = c.get("partner");
  const otherPartner = await getOtherPartner(
    c.env.DB,
    c.get("coupleId"),
    c.get("partnerId"),
  );
  if (otherPartner) {
    const origin = new URL(c.req.url).origin;
    const pushResult = await sendPushToPartner(
      otherPartner,
      c.env.VAPID_PRIVATE_KEY,
      {
        title: `${deleter.label} removed a plan`,
        body: existing.title,
        url: "/plans",
        tag: `${APP_SLUG}-plan-delete-${planId}`,
      },
      origin,
    );
    if (!pushResult.sent) {
      console.warn(
        "Plan delete push not delivered:",
        pushResult.error ?? pushResult.status,
      );
    }
  }

  return c.json({ ok: true });
});

app.get("/api/plans/:id/notes", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const planId = c.req.param("id");
  const plan = await getPlanById(c.env.DB, planId, c.get("coupleId"));
  if (!plan) return c.json({ error: "Not found" }, 404);

  const notes = await listPlanNotes(c.env.DB, c.get("coupleId"), planId);
  return c.json({ notes });
});

app.get("/api/plans/:id/media", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const planId = c.req.param("id");
  const plan = await getPlanById(c.env.DB, planId, c.get("coupleId"));
  if (!plan) return c.json({ error: "Not found" }, 404);

  const media = await listPlanMedia(c.env.DB, planId, c.get("coupleId"));
  return c.json({ media: media.map(normalizePlanImageMedia) });
});

app.get("/api/plans/:id/media/:mediaId", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const planId = c.req.param("id");
  const mediaId = c.req.param("mediaId");
  let media = await getPlanMediaById(
    c.env.DB,
    mediaId,
    planId,
    c.get("coupleId"),
  );
  if (!media) return c.json({ error: "Not found" }, 404);

  if (
    media.type === "video" &&
    media.status === "processing" &&
    media.cf_stream_id
  ) {
    try {
      const details = await c.env.STREAM.video(media.cf_stream_id).details();
      const ready = details.readyToStream === true;
      if (ready) {
        const playbackUrl =
          details.hlsPlaybackUrl ?? details.dashPlaybackUrl ?? null;
        const thumbnailUrl = details.thumbnail ?? null;
        media =
          (await updatePlanMedia(c.env.DB, mediaId, planId, c.get("coupleId"), {
            playbackUrl,
            thumbnailUrl,
            status: "ready",
          })) ?? media;
      } else if (details.status?.state === "error") {
        media =
          (await updatePlanMedia(c.env.DB, mediaId, planId, c.get("coupleId"), {
            status: "failed",
          })) ?? media;
      }
    } catch (err) {
      console.warn("Stream status check failed:", err);
    }
  }

  return c.json({ media: normalizePlanImageMedia(media) });
});

app.post("/api/plans/:id/media", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const planId = c.req.param("id");
  const coupleId = c.get("coupleId");
  const plan = await getPlanById(c.env.DB, planId, coupleId);
  if (!plan) return c.json({ error: "Not found" }, 404);

  const formData = await c.req.formData();
  const file = formData.get("file");
  const captionRaw = formData.get("caption");
  const caption = normalizeMediaCaption(captionRaw);

  if (!(file instanceof File)) {
    return c.json({ error: "Image file is required" }, 400);
  }

  const counts = await countPlanMediaByType(c.env.DB, planId, coupleId);
  const limitCheck = countMediaLimits(counts.images, counts.videos);
  if (!limitCheck.ok) return c.json({ error: limitCheck.error }, 400);

  if (!file.type.startsWith("image/")) {
    return c.json({ error: "Only image uploads are supported on this endpoint" }, 400);
  }

  const uploaded = await c.env.IMAGES.hosted.upload(file.stream(), {
    filename: file.name || "upload.jpg",
    metadata: { planId, coupleId },
  });

  const thumbnailUrl =
    pickImageVariantUrl(uploaded.variants, IMAGE_VARIANT_THUMBNAIL) ??
    pickImageVariantUrl(uploaded.variants, IMAGE_VARIANT_PUBLIC);
  const publicUrl =
    pickImageVariantUrl(uploaded.variants, IMAGE_VARIANT_PUBLIC) ?? thumbnailUrl;
  const mediaId = crypto.randomUUID();
  const media = await createPlanMedia(c.env.DB, {
    id: mediaId,
    planId,
    coupleId,
    fromPartnerId: c.get("partnerId"),
    type: "image",
    cfImageId: uploaded.id,
    thumbnailUrl,
    playbackUrl: publicUrl,
    caption,
    sortOrder: counts.images + counts.videos,
    status: "ready",
  });

  if (!plan.cover_media_id) {
    await updatePlan(c.env.DB, planId, coupleId, {
      title: plan.title,
      description: plan.description,
      startDate: plan.start_date,
      endDate: plan.end_date,
      budgetAmountCents: plan.budget_amount_cents,
      budgetCurrency: plan.budget_currency,
      coverMediaId: mediaId,
    });
  }

  return c.json({ media: normalizePlanImageMedia(media) }, 201);
});

app.post("/api/plans/:id/media/video", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const planId = c.req.param("id");
  const coupleId = c.get("coupleId");
  const plan = await getPlanById(c.env.DB, planId, coupleId);
  if (!plan) return c.json({ error: "Not found" }, 404);

  const counts = await countPlanMediaByType(c.env.DB, planId, coupleId);
  const limitCheck = countMediaLimits(counts.images, counts.videos);
  if (!limitCheck.ok) return c.json({ error: limitCheck.error }, 400);

  const body = await c.req.json<{ caption?: unknown }>().catch(() => ({}));
  const caption = normalizeMediaCaption(body.caption);

  let upload: { uploadURL: string; id: string };
  try {
    upload = await c.env.STREAM.createDirectUpload({
      maxDurationSeconds: 3600,
      meta: { planId, coupleId },
      creator: c.get("partnerId"),
    });
  } catch (err) {
    console.error("Stream direct upload failed:", err);
    return c.json({ error: "Video upload is not available right now" }, 502);
  }

  const mediaId = crypto.randomUUID();
  const media = await createPlanMedia(c.env.DB, {
    id: mediaId,
    planId,
    coupleId,
    fromPartnerId: c.get("partnerId"),
    type: "video",
    cfStreamId: upload.id,
    caption,
    sortOrder: counts.images + counts.videos,
    status: "processing",
  });

  return c.json(
    {
      media,
      uploadURL: upload.uploadURL,
    },
    201,
  );
});

app.patch("/api/plans/:id/media/:mediaId", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const planId = c.req.param("id");
  const mediaId = c.req.param("mediaId");
  const existing = await getPlanMediaById(
    c.env.DB,
    mediaId,
    planId,
    c.get("coupleId"),
  );
  if (!existing) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{ caption?: unknown; setCover?: unknown }>();
  const caption =
    body.caption !== undefined ? normalizeMediaCaption(body.caption) : undefined;

  if (body.caption !== undefined && body.caption !== "" && caption === null) {
    return c.json({ error: "Invalid caption" }, 400);
  }

  const media = await updatePlanMedia(
    c.env.DB,
    mediaId,
    planId,
    c.get("coupleId"),
    { caption: caption ?? null },
  );

  if (body.setCover === true) {
    const plan = await getPlanById(c.env.DB, planId, c.get("coupleId"));
    if (plan) {
      await updatePlan(c.env.DB, planId, c.get("coupleId"), {
        title: plan.title,
        description: plan.description,
        startDate: plan.start_date,
        endDate: plan.end_date,
        budgetAmountCents: plan.budget_amount_cents,
        budgetCurrency: plan.budget_currency,
        coverMediaId: mediaId,
      });
    }
  }

  return c.json({ media: media ? normalizePlanImageMedia(media) : null });
});

app.delete("/api/plans/:id/media/:mediaId", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const planId = c.req.param("id");
  const mediaId = c.req.param("mediaId");
  const coupleId = c.get("coupleId");
  const deleted = await deletePlanMedia(c.env.DB, mediaId, planId, coupleId);
  if (!deleted) return c.json({ error: "Not found" }, 404);

  if (deleted.type === "image") {
    await deleteHostedImage(c.env.IMAGES, deleted.cf_image_id);
  } else {
    await deleteStreamVideo(c.env.STREAM, deleted.cf_stream_id);
  }

  await clearPlanCoverIfMedia(c.env.DB, planId, coupleId, mediaId);

  return c.json({ ok: true });
});

app.get("/api/plans/:id/expenses", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const planId = c.req.param("id");
  const plan = await getPlanById(c.env.DB, planId, c.get("coupleId"));
  if (!plan) return c.json({ error: "Not found" }, 404);

  const expenses = await listPlanExpenses(c.env.DB, planId, c.get("coupleId"));
  return c.json({ expenses, spentCents: plan.spent_cents });
});

app.post("/api/plans/:id/expenses", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const planId = c.req.param("id");
  const coupleId = c.get("coupleId");
  const plan = await getPlanById(c.env.DB, planId, coupleId);
  if (!plan) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{
    label?: unknown;
    amountCents?: unknown;
    paidByPartnerId?: unknown;
    category?: unknown;
    expenseDate?: unknown;
  }>();
  const parsed = parsePlanExpenseBody(body);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const partners = await getPartnersByCoupleId(c.env.DB, coupleId);
  const paidBy = partners.find((p) => p.id === parsed.data.paidByPartnerId);
  if (!paidBy) return c.json({ error: "Invalid paid by partner" }, 400);

  const id = crypto.randomUUID();
  const expense = await createPlanExpense(c.env.DB, {
    id,
    planId,
    coupleId,
    fromPartnerId: c.get("partnerId"),
    paidByPartnerId: parsed.data.paidByPartnerId,
    label: parsed.data.label,
    amountCents: parsed.data.amountCents,
    category: parsed.data.category,
    expenseDate: parsed.data.expenseDate,
  });

  return c.json({ expense }, 201);
});

app.patch("/api/plans/:id/expenses/:expenseId", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const planId = c.req.param("id");
  const expenseId = c.req.param("expenseId");
  const coupleId = c.get("coupleId");
  const existing = await getPlanExpenseById(
    c.env.DB,
    expenseId,
    planId,
    coupleId,
  );
  if (!existing) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{
    label?: unknown;
    amountCents?: unknown;
    paidByPartnerId?: unknown;
    category?: unknown;
    expenseDate?: unknown;
  }>();
  const parsed = parsePlanExpenseBody(body);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const partners = await getPartnersByCoupleId(c.env.DB, coupleId);
  const paidBy = partners.find((p) => p.id === parsed.data.paidByPartnerId);
  if (!paidBy) return c.json({ error: "Invalid paid by partner" }, 400);

  const expense = await updatePlanExpense(
    c.env.DB,
    expenseId,
    planId,
    coupleId,
    {
      label: parsed.data.label,
      amountCents: parsed.data.amountCents,
      paidByPartnerId: parsed.data.paidByPartnerId,
      category: parsed.data.category,
      expenseDate: parsed.data.expenseDate,
    },
  );

  return c.json({ expense });
});

app.delete("/api/plans/:id/expenses/:expenseId", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const planId = c.req.param("id");
  const expenseId = c.req.param("expenseId");
  const deleted = await deletePlanExpense(
    c.env.DB,
    expenseId,
    planId,
    c.get("coupleId"),
  );
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

app.get("/api/notes", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const notes = await listNotes(c.env.DB, c.get("coupleId"));
  return c.json({ notes });
});

app.get("/api/notes/:id", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const note = await getNoteById(c.env.DB, c.req.param("id"), c.get("coupleId"));
  if (!note) return c.json({ error: "Not found" }, 404);
  return c.json({ note });
});

app.post("/api/notes", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const body = await c.req.json<{
    type?: unknown;
    title?: unknown;
    body?: unknown;
    items?: unknown;
    planId?: unknown;
  }>();
  const parsed = parseNoteBody(body, () => crypto.randomUUID());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  let planId: string | null = null;
  if (body.planId != null && body.planId !== "") {
    if (typeof body.planId !== "string") {
      return c.json({ error: "Invalid plan" }, 400);
    }
    const plan = await getPlanById(c.env.DB, body.planId, c.get("coupleId"));
    if (!plan) return c.json({ error: "Plan not found" }, 400);
    planId = plan.id;
  }

  const partnerId = c.get("partnerId");
  const id = crypto.randomUUID();
  const note = await createNote(c.env.DB, {
    id,
    coupleId: c.get("coupleId"),
    fromPartnerId: partnerId,
    planId,
    type: parsed.data.type,
    title: parsed.data.title,
    body: parsed.data.type === "simple" ? parsed.data.body : null,
    itemsJson:
      parsed.data.type === "todo"
        ? serializeTodoItems(parsed.data.items)
        : null,
  });

  const sender = c.get("partner");
  const otherPartner = await getOtherPartner(
    c.env.DB,
    c.get("coupleId"),
    partnerId,
  );
  if (otherPartner) {
    const origin = new URL(c.req.url).origin;
    const pushTitle =
      parsed.data.type === "todo"
        ? `${sender.label} added a list`
        : `${sender.label} added a note`;
    const pushBody =
      parsed.data.type === "todo"
        ? parsed.data.title
        : parsed.data.title ?? parsed.data.body.slice(0, 80);
    const pushUrl = planId ? `/notes/${id}` : "/notes?tab=all";
    const pushResult = await sendPushToPartner(
      otherPartner,
      c.env.VAPID_PRIVATE_KEY,
      {
        title: pushTitle,
        body: pushBody,
        url: pushUrl,
        tag: `${APP_SLUG}-note-${id}`,
      },
      origin,
    );
    if (!pushResult.sent) {
      console.warn(
        "Note create push not delivered:",
        pushResult.error ?? pushResult.status,
      );
    }
  }

  return c.json({ note }, 201);
});

app.patch("/api/notes/:id", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const noteId = c.req.param("id");
  const existing = await getNoteById(c.env.DB, noteId, c.get("coupleId"));
  if (!existing) return c.json({ error: "Not found" }, 404);
  if (existing.deleted_at != null) {
    return c.json({ error: "Note is deleted" }, 409);
  }

  const body = await c.req.json<{
    type?: unknown;
    title?: unknown;
    body?: unknown;
    items?: unknown;
  }>();
  const parsed = parseNoteBody(
    { ...body, type: body.type ?? existing.type },
    () => crypto.randomUUID(),
  );
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  if (parsed.data.type !== existing.type) {
    return c.json({ error: "Cannot change note type" }, 400);
  }

  const partnerId = c.get("partnerId");
  const now = Date.now();
  let itemsJson: string | null = null;
  let newlyCompleted: ReturnType<typeof findNewlyCompletedItems> = [];

  if (parsed.data.type === "todo") {
    const existingItems = existing.items ?? [];
    const merged = mergeTodoItems(
      existingItems,
      parsed.data.items,
      partnerId,
      now,
    );
    newlyCompleted = findNewlyCompletedItems(
      existingItems,
      merged,
      partnerId,
    );
    itemsJson = serializeTodoItems(merged);
  }

  const note = await updateNote(c.env.DB, noteId, c.get("coupleId"), {
    title: parsed.data.title,
    body: parsed.data.type === "simple" ? parsed.data.body : null,
    itemsJson:
      parsed.data.type === "todo"
        ? itemsJson
        : null,
  });
  if (!note) return c.json({ error: "Not found" }, 404);

  const editor = c.get("partner");
  const otherPartner = await getOtherPartner(
    c.env.DB,
    c.get("coupleId"),
    partnerId,
  );
  if (otherPartner && newlyCompleted.length > 0) {
    const origin = new URL(c.req.url).origin;
    const checkedItem = newlyCompleted[0];
    const pushResult = await sendPushToPartner(
      otherPartner,
      c.env.VAPID_PRIVATE_KEY,
      {
        title: `${editor.label} checked off an item`,
        body: checkedItem.text,
        url: "/notes?tab=all",
        tag: `${APP_SLUG}-note-todo-${noteId}`,
      },
      origin,
    );
    if (!pushResult.sent) {
      console.warn(
        "Note todo push not delivered:",
        pushResult.error ?? pushResult.status,
      );
    }
  }

  return c.json({ note });
});

app.delete("/api/notes/:id", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const noteId = c.req.param("id");
  const existing = await getNoteById(c.env.DB, noteId, c.get("coupleId"));
  if (!existing) return c.json({ error: "Not found" }, 404);
  if (existing.deleted_at != null) {
    return c.json({ error: "Note is already deleted" }, 409);
  }

  await deleteNote(c.env.DB, noteId, c.get("coupleId"), c.get("partnerId"));

  const deleter = c.get("partner");
  const otherPartner = await getOtherPartner(
    c.env.DB,
    c.get("coupleId"),
    c.get("partnerId"),
  );
  if (otherPartner) {
    const origin = new URL(c.req.url).origin;
    const pushBody =
      existing.type === "todo"
        ? (existing.title ?? "List")
        : (existing.title ?? existing.body?.slice(0, 80) ?? "Note");
    const pushResult = await sendPushToPartner(
      otherPartner,
      c.env.VAPID_PRIVATE_KEY,
      {
        title: `${deleter.label} deleted a note`,
        body: pushBody,
        url: "/notes?tab=all",
        tag: `${APP_SLUG}-note-delete-${noteId}`,
      },
      origin,
    );
    if (!pushResult.sent) {
      console.warn(
        "Note delete push not delivered:",
        pushResult.error ?? pushResult.status,
      );
    }
  }

  return c.json({ ok: true });
});

app.get("/api/location/shares/latest", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const shares = await getLatestLocationShares(c.env.DB, c.get("coupleId"));
  return c.json({ shares });
});

app.post("/api/location/shares", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  const partners = await getPartnersByCoupleId(c.env.DB, c.get("coupleId"));
  if (partners.length < 2) {
    return c.json({ error: "Partner not connected yet" }, 400);
  }

  const partnerId = c.get("partnerId");
  if (await isLocationShareRateLimited(c.env.DB, partnerId)) {
    return c.json({ error: "Please wait before sharing again" }, 429);
  }

  const body = await c.req.json<{
    latitude?: unknown;
    longitude?: unknown;
    accuracyM?: unknown;
    label?: unknown;
  }>();
  const parsed = parseLocationShareBody(body);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const id = crypto.randomUUID();
  const share = await createLocationShare(c.env.DB, {
    id,
    coupleId: c.get("coupleId"),
    fromPartnerId: partnerId,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    accuracyM: parsed.data.accuracyM,
    label: parsed.data.label,
  });

  const sender = c.get("partner");
  const otherPartner = await getOtherPartner(
    c.env.DB,
    c.get("coupleId"),
    partnerId,
  );
  if (otherPartner) {
    const origin = new URL(c.req.url).origin;
    const pushBody = parsed.data.label ?? "Tap to view on the map";
    const pushResult = await sendPushToPartner(
      otherPartner,
      c.env.VAPID_PRIVATE_KEY,
      {
        title: `${sender.label} shared their location`,
        body: pushBody,
        url: "/location",
        tag: `${APP_SLUG}-location-${id}`,
      },
      origin,
    );
    if (!pushResult.sent) {
      console.warn(
        "Location share push not delivered:",
        pushResult.error ?? pushResult.status,
      );
    }
  }

  return c.json({ share }, 201);
});

app.delete("/api/location/shares/mine", async (c) => {
  const authError = await requireSession(c);
  if (authError) return c.json({ error: authError.error }, authError.status);

  await deleteLocationSharesForPartner(c.env.DB, c.get("partnerId"));
  return c.json({ ok: true });
});

export default {
  fetch: app.fetch,
  scheduled: handleScheduledReminders,
};

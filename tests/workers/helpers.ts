import { env } from "cloudflare:workers";
import { app } from "../../worker/index";

export function authHeaders(token?: string): Record<string, string> {
  return token ? { "X-Session-Token": token } : {};
}

export async function api<T = unknown>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {},
): Promise<{ status: number; data: T }> {
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(options.token),
    },
  };
  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }
  // Hono app.request with the test env (real local D1, stub vars).
  const res = await app.request(
    path,
    init,
    env as unknown as Parameters<typeof app.request>[2],
  );
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}

export interface CoupleFixture {
  tokenA: string;
  tokenB: string;
  codeA: string;
  coupleId: string;
  partnerIdA: string;
}

export async function createPairedCouple(
  nameA = "Alex",
  nameB = "Sam",
): Promise<CoupleFixture> {
  const created = await api<{ sessionToken: string }>("/api/couples/create", {
    method: "POST",
    body: { name: nameA },
  });
  if (created.status !== 201) throw new Error(`create failed: ${created.status}`);
  const tokenA = created.data.sessionToken;

  const meA = await api<{
    coupleId: string;
    myCode: string;
    partnerId: string;
  }>("/api/me", { token: tokenA });
  if (meA.status !== 200) throw new Error(`me failed: ${meA.status}`);

  const joined = await api<{ sessionToken: string }>("/api/couples/connect", {
    method: "POST",
    body: { code: meA.data.myCode, name: nameB },
  });
  if (joined.status !== 201) {
    throw new Error(`connect failed: ${joined.status} ${JSON.stringify(joined.data)}`);
  }

  return {
    tokenA,
    tokenB: joined.data.sessionToken,
    codeA: meA.data.myCode,
    coupleId: meA.data.coupleId,
    partnerIdA: meA.data.partnerId,
  };
}

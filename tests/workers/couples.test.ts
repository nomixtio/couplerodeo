import { describe, expect, it } from "vitest";
import { api, createPairedCouple } from "./helpers";

describe("POST /api/couples/create", () => {
  it("requires a name", async () => {
    const res = await api("/api/couples/create", { method: "POST", body: {} });
    expect(res.status).toBe(400);
  });

  it("creates a couple and returns a session token", async () => {
    const res = await api<{ sessionToken: string }>("/api/couples/create", {
      method: "POST",
      body: { name: "Alex" },
    });
    expect(res.status).toBe(201);
    expect(typeof res.data.sessionToken).toBe("string");
  });
});

describe("POST /api/couples/connect", () => {
  it("rejects unknown codes with 404", async () => {
    const res = await api("/api/couples/connect", {
      method: "POST",
      body: { code: "NOPE1234", name: "Sam" },
    });
    expect(res.status).toBe(404);
  });

  it("reconnects on a new device with either personal code", async () => {
    const fixture = await createPairedCouple("Solo", "Partner");
    const meB = await api<{ myCode: string }>("/api/me", { token: fixture.tokenB });
    // Per README reconnect flow: entering your own personal code logs you back in.
    const res = await api<{ sessionToken: string }>("/api/couples/connect", {
      method: "POST",
      body: { code: meB.data.myCode, name: "Intruder" },
    });
    expect(res.status).toBe(201);
    expect(typeof res.data.sessionToken).toBe("string");
  });

  it("pairs two partners and reports partnerConnected", async () => {
    const fixture = await createPairedCouple();
    const me = await api<{ partnerConnected: boolean; partnerName: string | null }>(
      "/api/me",
      { token: fixture.tokenA },
    );
    expect(me.status).toBe(200);
    expect(me.data.partnerConnected).toBe(true);
    expect(me.data.partnerName).toBe("Sam");
  });
});

describe("session auth", () => {
  it("returns 401 without a token", async () => {
    const res = await api("/api/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 for an invalid token", async () => {
    const res = await api("/api/me", { token: "bogus" });
    expect(res.status).toBe(401);
  });

  it("logs out and invalidates the session", async () => {
    const fixture = await createPairedCouple("Ava", "Ben");
    const logout = await api("/api/session/logout", {
      method: "POST",
      token: fixture.tokenA,
    });
    expect(logout.status).toBe(200);
    const me = await api("/api/me", { token: fixture.tokenA });
    expect(me.status).toBe(401);
  });
});

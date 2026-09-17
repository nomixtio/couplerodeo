import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSession,
  getSessionToken,
  hasSession,
  partnerDisplayName,
  partnerLabel,
  setSessionToken,
} from "./partner";

beforeEach(() => {
  if (typeof localStorage === "undefined") {
    const store = new Map<string, string>();
    (globalThis as unknown as Record<string, unknown>).localStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    };
  } else {
    localStorage.clear();
  }
});

describe("session token storage", () => {
  it("sets, gets, checks and clears the token", () => {
    expect(hasSession()).toBe(false);
    expect(getSessionToken()).toBeNull();
    setSessionToken("abc");
    expect(getSessionToken()).toBe("abc");
    expect(hasSession()).toBe(true);
    clearSession();
    expect(hasSession()).toBe(false);
  });
});

describe("partnerDisplayName", () => {
  it("falls back to your partner", () => {
    expect(partnerDisplayName(" Alex ")).toBe("Alex");
    expect(partnerDisplayName("")).toBe("your partner");
    expect(partnerDisplayName(null)).toBe("your partner");
  });
});

describe("partnerLabel", () => {
  it("labels self as You", () => {
    expect(partnerLabel("p1", "p1", "Alex")).toBe("You");
    expect(partnerLabel("p2", "p1", "Alex")).toBe("Alex");
    expect(partnerLabel("p2", "p1", "")).toBe("Your partner");
  });
});

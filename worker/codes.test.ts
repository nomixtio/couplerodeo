import { describe, expect, it } from "vitest";
import {
  formatInviteCode,
  generateInviteCode,
  generateRecoveryCode,
  normalizeInviteCode,
} from "./codes";

describe("invite codes", () => {
  it("generates AAA-BBB shaped codes from the invite alphabet", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{3}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{3}$/);
  });

  it("normalizes and formats codes", () => {
    expect(normalizeInviteCode(" abc-123 ")).toBe("ABC123");
    expect(formatInviteCode("ABC123")).toBe("ABC-123");
    expect(formatInviteCode("short")).toBe("short");
  });
});

describe("generateRecoveryCode", () => {
  it("generates 8-char codes", () => {
    const code = generateRecoveryCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
  });
});

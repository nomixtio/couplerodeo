import { describe, expect, it } from "vitest";
import {
  buildMapsUrl,
  formatAccuracyM,
  formatCoordinates,
  formatLocationAge,
  isLocationStale,
  isValidLatitude,
  isValidLongitude,
  LOCATION_STALE_MS,
  parseLocationShareBody,
} from "./location";

describe("coordinate validation", () => {
  it("accepts in-range coordinates", () => {
    expect(isValidLatitude(48.85)).toBe(true);
    expect(isValidLatitude(-91)).toBe(false);
    expect(isValidLongitude(2.35)).toBe(true);
    expect(isValidLongitude(181)).toBe(false);
    expect(isValidLatitude(Number.NaN)).toBe(false);
  });
});

describe("parseLocationShareBody", () => {
  it("accepts a minimal valid share", () => {
    expect(
      parseLocationShareBody({ latitude: 48.85, longitude: 2.35 }),
    ).toEqual({
      ok: true,
      data: { latitude: 48.85, longitude: 2.35, accuracyM: null, label: null },
    });
  });

  it("rejects invalid coordinates and oversized labels", () => {
    expect(parseLocationShareBody({ latitude: 100, longitude: 0 }).ok).toBe(false);
    expect(parseLocationShareBody({ latitude: 0 }).ok).toBe(false);
    expect(
      parseLocationShareBody({ latitude: 0, longitude: 0, label: "x".repeat(81) }).ok,
    ).toBe(false);
    expect(
      parseLocationShareBody({ latitude: 0, longitude: 0, accuracyM: -1 }).ok,
    ).toBe(false);
  });
});

describe("location formatting", () => {
  it("formats age, staleness, urls and accuracy", () => {
    const now = Date.now();
    expect(formatLocationAge(now, now)).toBe("just now");
    expect(formatLocationAge(now - 5 * 60_000, now)).toBe("5 min ago");
    expect(isLocationStale(now - LOCATION_STALE_MS - 1, now)).toBe(true);
    expect(isLocationStale(now, now)).toBe(false);
    expect(buildMapsUrl(1, 2)).toBe("https://www.google.com/maps?q=1,2");
    expect(formatCoordinates(1.234567, 2)).toBe("1.23457, 2.00000");
    expect(formatAccuracyM(null)).toBeNull();
    expect(formatAccuracyM(50)).toBe("±50 m");
    expect(formatAccuracyM(1500)).toBe("±1.5 km");
  });
});

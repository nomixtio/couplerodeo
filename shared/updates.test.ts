import { describe, expect, it } from "vitest";
import {
  isGiphyUrl,
  normalizeUpdateKind,
  normalizeUpdateResponseKind,
} from "./updates";

describe("normalizeUpdateKind", () => {
  it("passes known kinds and defaults to text", () => {
    expect(normalizeUpdateKind("love")).toBe("love");
    expect(normalizeUpdateKind("media")).toBe("media");
    expect(normalizeUpdateKind("nope")).toBe("text");
    expect(normalizeUpdateKind(null)).toBe("text");
  });
});

describe("normalizeUpdateResponseKind", () => {
  it("defaults to gif", () => {
    expect(normalizeUpdateResponseKind("answer")).toBe("answer");
    expect(normalizeUpdateResponseKind("emoji")).toBe("emoji");
    expect(normalizeUpdateResponseKind("gif")).toBe("gif");
    expect(normalizeUpdateResponseKind("other")).toBe("gif");
  });
});

describe("isGiphyUrl", () => {
  it("accepts https giphy hosts only", () => {
    expect(isGiphyUrl("https://media.giphy.com/media/abc/giphy.gif")).toBe(true);
    expect(isGiphyUrl("https://i.giphy.com/abc.gif")).toBe(true);
    expect(isGiphyUrl("https://media0.giphy.com/media/abc/giphy.gif")).toBe(true);
    expect(isGiphyUrl("http://media.giphy.com/media/abc/giphy.gif")).toBe(false);
    expect(isGiphyUrl("https://example.com/cat.gif")).toBe(false);
    expect(isGiphyUrl("not a url")).toBe(false);
  });
});

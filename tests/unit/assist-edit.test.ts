import { describe, expect, it } from "vitest";
import {
  ASSIST_EDIT_WINDOW_MS,
  withinAssistEditWindow,
} from "@/lib/domain/assist-edit";

describe("withinAssistEditWindow", () => {
  const now = new Date("2026-09-10T12:00:00.000Z");

  it("is false without endedAt", () => {
    expect(withinAssistEditWindow(null, now)).toBe(false);
    expect(withinAssistEditWindow(undefined, now)).toBe(false);
  });

  it("is true inside the 24h window", () => {
    const ended = new Date(now.getTime() - ASSIST_EDIT_WINDOW_MS + 60_000).toISOString();
    expect(withinAssistEditWindow(ended, now)).toBe(true);
  });

  it("is false after the 24h window", () => {
    const ended = new Date(now.getTime() - ASSIST_EDIT_WINDOW_MS - 1).toISOString();
    expect(withinAssistEditWindow(ended, now)).toBe(false);
  });
});

import { describe, expect, test } from "vitest";
import { activeHeadingId, pairedScrollOffset } from "@/lib/scroll-sync";

describe("pane scroll sync", () => {
  test("maps a scroll position onto the other pane", () => {
    expect(pairedScrollOffset(
      { scrollTop: 50, scrollHeight: 200, clientHeight: 100 },
      { scrollHeight: 400, clientHeight: 100 },
    )).toBe(150);
    expect(pairedScrollOffset(
      { scrollTop: 0, scrollHeight: 100, clientHeight: 100 },
      { scrollHeight: 400, clientHeight: 100 },
    )).toBe(0);
  });

  test("keeps the heading that has reached the top of the preview", () => {
    const entries = [
      { id: "intro", top: 0 },
      { id: "details", top: 240 },
      { id: "math", top: 800 },
    ];
    expect(activeHeadingId(entries, 20)).toBe("intro");
    expect(activeHeadingId(entries, 260)).toBe("details");
    expect(activeHeadingId([], 0)).toBeNull();
  });
});

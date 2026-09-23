import { describe, expect, test } from "vitest";
import { conversionProgressPercent } from "@/lib/import-progress";

describe("conversion progress", () => {
  test("stays indeterminate until both the current step and the total are known", () => {
    expect(conversionProgressPercent()).toBeNull();
    expect(conversionProgressPercent({ current: 1 })).toBeNull();
    expect(conversionProgressPercent({ total: 4 })).toBeNull();
  });

  test("reports a bounded percentage when the total is known", () => {
    expect(conversionProgressPercent({ current: 0, total: 4 })).toBe(0);
    expect(conversionProgressPercent({ current: 1, total: 4 })).toBe(25);
    expect(conversionProgressPercent({ current: 9, total: 4 })).toBe(100);
  });
});
